export default class FrustumTools {
    public static getObjectVisibilityInFrustum(cameraTransform: Transform, objArray: SceneObject[],
        cameraFOV: number = 46, maxViewDistance: number = 10000): SceneObjectWithMetrics[] | undefined {
        if (!cameraTransform) return;
        // Calculate distances and visibility metrics
        const objectsWithMetrics = objArray.map(sceneObject => new SceneObjectWithMetrics(
            sceneObject,
            FrustumTools.getDistanceToCamera(sceneObject, cameraTransform),
            FrustumTools.isObjectInView(sceneObject, cameraTransform, maxViewDistance, cameraFOV),
            FrustumTools.getAngleFromCamera(sceneObject, cameraTransform)
        ));

        // Sort by priority: in-view first, then by distance, then by angle from center
        objectsWithMetrics.sort((a, b) => {
            // Prioritize aircraft in view
            if (a.isInView && !b.isInView) return -1;
            if (!a.isInView && b.isInView) return 1;

            // Among aircraft with same view status, prioritize by distance
            if (Math.abs(a.distance - b.distance) > 1.0) {
                return a.distance - b.distance;
            }

            // If distances are similar, prioritize by angle from camera center
            return a.angleFromCenter - b.angleFromCenter;
        });
        return objectsWithMetrics
    }

    private static cachedFrustum: {
        camPos: vec3,
        camForward: vec3,
        halfFOVRadians: number,
        timestamp: number
    } = null;

    public static isObjectInView(sceneObject: SceneObject, cameraTransform: Transform, maxViewDistance: number, cameraFOV: number): boolean {
        // Cache camera data since it's the same for all objects in a frame
        const now = getTime();
        if (!this.cachedFrustum || now !== this.cachedFrustum.timestamp) {
            this.cachedFrustum = {
                camPos: cameraTransform.getWorldPosition(),
                camForward: cameraTransform.forward,
                halfFOVRadians: (cameraFOV * Math.PI / 180) / 2,
                timestamp: now
            };
        }

        const objPosition = sceneObject.getTransform().getWorldPosition();
        const vectorToObject = objPosition.sub(this.cachedFrustum.camPos);
        const distance = vectorToObject.length;

        // Distance check first (cheap)
        if (distance > maxViewDistance) return false;
        if (distance < 0.001) return true;

        // Frustum check
        const vectorToObjectNormalized = vectorToObject.uniformScale(1.0 / distance);
        const forwardDot = vectorToObjectNormalized.dot(this.cachedFrustum.camForward);

        if (forwardDot > 0) return false; // Behind camera

        const angleFromForward = Math.acos(Math.max(-1, Math.min(1, Math.abs(forwardDot))));
        return angleFromForward <= this.cachedFrustum.halfFOVRadians;
    }

    public static getAngleFromCamera(sceneObject: SceneObject, cameraTransform: Transform): number {
        const objPosition = sceneObject.getTransform().getWorldPosition();
        var cameraPosition = cameraTransform.getWorldPosition()
        var cameraForward = cameraTransform.forward;
        const vectorToObject = objPosition.sub(cameraPosition);

        // Calculate angle from camera forward direction (0 = center of view)
        const dot = vectorToObject.dot(cameraForward);
        // Use absolute value to handle the inverted coordinate system
        return Math.acos(Math.max(-1, Math.min(1, Math.abs(dot))));
    }

    public static getDistanceToCamera(sceneObject: SceneObject, viewPointTransform: Transform): number {
        const aircraftPosition = sceneObject.getTransform().getWorldPosition();
        return aircraftPosition.distance(viewPointTransform.getWorldPosition());
    }
}

export class SceneObjectWithMetrics {
    sceneObject: SceneObject;
    distance: number;
    isInView: boolean
    angleFromCenter: number;

    constructor(sceneObject: SceneObject, distance: number, isInView: boolean, angleFromCenter: number) {
        this.sceneObject = sceneObject;
        this.distance = distance;
        this.isInView = isInView;
        this.angleFromCenter = angleFromCenter;
    }
}