export class TrailTube {
    private material: Material;
    private radius: number;
    private radialSegments: number;
    private maxPoints: number;
    private minDistance: number;

    private points: vec3[] = [];
    private sceneObject: SceneObject;
    private meshVisual: RenderMeshVisual;
    private builder: MeshBuilder;
    private meshDirty: boolean = false;
    private lastMeshUpdate: number = 0;
    private readonly MESH_UPDATE_INTERVAL = 0.1; // Update mesh max 10 times per second

    // Cache to avoid recomputing too often
    private cumulativeLengths: number[] = [];

    constructor(options: {
        material: Material,
        radius?: number,
        radialSegments?: number,
        maxPoints?: number,
        minDistance?: number,
        name?: string,
    }) {
        this.material = options.material;
        this.radius = options.radius ?? 0.005; // ~line width 0.01 equivalent
        this.radialSegments = Math.max(3, Math.floor(options.radialSegments ?? 8));
        this.maxPoints = options.maxPoints ?? 200;
        this.minDistance = options.minDistance ?? 0.05;

        const name = options.name ?? "TrailTube";
        this.sceneObject = global.scene.createSceneObject(name);
        this.meshVisual = this.sceneObject.createComponent("RenderMeshVisual") as RenderMeshVisual;
        if (this.meshVisual.materials.length > 0) {
            this.meshVisual.materials = [this.material];
        } else {
            this.meshVisual.addMaterial(this.material);
        }

        // position(3), normal(3), texture0(2)
        this.builder = new MeshBuilder([
            { name: "position", components: 3 },
            { name: "normal", components: 3 },
            { name: "texture0", components: 2 },
        ]);
        // Ensure index buffer uses a valid type
        this.builder.indexType = MeshIndexType.UInt16;
        this.meshVisual.mesh = this.builder.getMesh();
    }

    public setParent(parent: SceneObject): void {
        this.sceneObject.setParent(parent);
    }

    public getSceneObject(): SceneObject {
        return this.sceneObject;
    }

    public clear(): void {
        this.points = [];
        this.cumulativeLengths = [];
        this.rebuildMesh();
    }

    public addPoint(p: vec3): void {
        if (this.points.length > 0) {
            const last = this.points[this.points.length - 1];
            if (p.distance(last) < this.minDistance) {
                return;
            }
        }

        this.points.push(p);
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
        this.rebuildMesh();
    }



    public updateLastPoint(p: vec3): void {
        if (this.points.length === 0) {
            this.addPoint(p);
            return;
        }
        const lastIdx = this.points.length - 1;

        // Check if change is significant enough
        if (this.points[lastIdx].distance(p) < this.minDistance * 0.5) {
            return; // No significant movement
        }

        this.points[lastIdx] = p;
        this.meshDirty = true;

        // Throttle mesh updates
        const now = getTime();
        if (now - this.lastMeshUpdate >= this.MESH_UPDATE_INTERVAL) {
            this.rebuildMesh();
            this.meshDirty = false;
            this.lastMeshUpdate = now;
        }
    }

    // Call this before destroying if mesh is dirty
    public flush(): void {
        if (this.meshDirty) {
            this.rebuildMesh();
            this.meshDirty = false;
        }
    }

    public destroy(): void {
        if (this.sceneObject) {
            try {
                this.clear();
                this.meshVisual.enabled = false;
                this.meshVisual.destroy();
                this.sceneObject.destroy();
            } catch (e) {
                print("Error destroying TrailTube: " + e);
            }
        }
    }

    private rebuildMesh(): void {
        // Clear any previous data
        if (this.builder.getVerticesCount() > 0) {
            this.builder.eraseVertices(0, this.builder.getVerticesCount());
        }
        if (this.builder.getIndicesCount() > 0) {
            this.builder.eraseIndices(0, this.builder.getIndicesCount());
        }

        const n = this.points.length;
        if (n < 2) {
            this.builder.updateMesh();
            return;
        }

        // Precompute tangents and cumulative lengths
        const tangents: vec3[] = new Array(n);
        this.cumulativeLengths = new Array(n).fill(0);
        let totalLen = 0;
        for (let i = 0; i < n; i++) {
            const prev = i > 0 ? this.points[i - 1] : this.points[i];
            const next = i < n - 1 ? this.points[i + 1] : this.points[i];
            let t = next.sub(prev);
            const len = Math.max(1e-6, t.length);
            t = t.uniformScale(1 / len);
            tangents[i] = t;

            if (i > 0) {
                const segLen = this.points[i].distance(this.points[i - 1]);
                totalLen += segLen;
                this.cumulativeLengths[i] = totalLen;
            }
        }

        // Build vertices
        const verts: number[] = [];
        const indices: number[] = [];
        const rings = n;
        const segs = this.radialSegments;

        for (let i = 0; i < rings; i++) {
            const center = this.points[i];
            const tangent = tangents[i];

            // Build a stable frame (normal, binormal)
            let ref = vec3.up();
            // If tangent is almost parallel to up, switch reference
            if (Math.abs(tangent.dot(ref)) > 0.95) {
                ref = new vec3(1, 0, 0);
            }
            let normal = tangent.cross(ref);
            if (normal.length < 1e-6) {
                // fallback
                normal = new vec3(0, 0, 1);
            }
            normal = normal.normalize();
            let binormal = tangent.cross(normal).normalize();

            const u = totalLen > 0 ? this.cumulativeLengths[i] / totalLen : 0;

            for (let j = 0; j < segs; j++) {
                const theta = (j / segs) * Math.PI * 2;
                const cosT = Math.cos(theta);
                const sinT = Math.sin(theta);

                const offset = normal.uniformScale(cosT * this.radius).add(binormal.uniformScale(sinT * this.radius));
                const pos = center.add(offset);
                const nrm = offset.normalize();
                const v = j / segs; // around tube

                verts.push(
                    pos.x, pos.y, pos.z,
                    nrm.x, nrm.y, nrm.z,
                    u, v
                );
            }
        }

        // Build indices to connect rings
        const ringVerts = segs;
        for (let i = 0; i < rings - 1; i++) {
            const currStart = i * ringVerts;
            const nextStart = (i + 1) * ringVerts;
            for (let j = 0; j < segs; j++) {
                const a = currStart + j;
                const b = currStart + ((j + 1) % segs);
                const c = nextStart + j;
                const d = nextStart + ((j + 1) % segs);

                // two triangles: a-c-b and b-c-d
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }

        // Commit to builder using interleaved vertex data (pos, normal, uv per vertex)
        this.builder.appendVerticesInterleaved(verts);
        this.builder.appendIndices(indices);
        this.builder.topology = MeshTopology.Triangles;
        this.builder.updateMesh();
    }
}

export default TrailTube;
