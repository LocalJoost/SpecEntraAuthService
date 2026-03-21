import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider";
import { HandInputData } from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData";
import { HandType } from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandType";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { Pose } from "../../Utils/Pose";
import { VectorUtils } from "../../Utils/VectorUtils";

@component
export class ViewDirectionLocator extends BaseScriptComponent {
    @input lookDownIndicator: SceneObject;
    @input locationDisplayer: SceneObject;
    @input autoStop: boolean = true;
    
    private onLocationDeterminedEvent = new Event<Pose>();
    public readonly onLocationDetermined = this.onLocationDeterminedEvent.publicApi();

    private readonly MIN_VERTICAL_DISTANCE = 75;
    private readonly EPSILON = 0.01;
    private readonly MAX_RAY_LENGTH = 10000;
    private cameraTransform = WorldCameraFinderProvider.getInstance().getTransform();
    private locationDisplayerTransform: Transform
    private probe = Physics.createGlobalProbe();
    private hitFailureCount = 0;
    private reportCount = 0;

    private handProvider: HandInputData = HandInputData.getInstance();
    private leftHand = this.handProvider.getHand("left" as HandType);
    private rightHand = this.handProvider.getHand("right" as HandType);
    private lastPose: Pose = null;
    

    private isActive: boolean

    @input interactable: Interactable

    onAwake(): void {
        this.stop();
        this.locationDisplayerTransform = this.locationDisplayer.getTransform();
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    public start() : void   {
        this.hitFailureCount = 0;
        this.processHitResult(false, true);
        this.isActive = true;
        this.interactable.onInteractorTriggerStart.add(() => this.reportLocation(true));
    }

    public stop() : void
    {
        this.isActive = false;
        this.locationDisplayer.enabled = false;
        this.lookDownIndicator.enabled = false;
    }

    onUpdate() {
        if (!this.isActive) {
            return;
        }
        const camPos = this.cameraTransform.getWorldPosition();
        const camForward = this.cameraTransform.forward;
        this.probe.rayCastAll(camPos, camPos.sub(camForward.mult(VectorUtils.scalar3(this.MAX_RAY_LENGTH))), (hits: RayCastHit[]) => {
            var hit = this.GetFirstValidHit(hits);
            if( hit !== null) {
             this.onHitTestResult(hit, camForward, camPos);
        }
        });
        if (this.leftHand.isPinching() || this.rightHand.isPinching()) {
            this.reportLocation();
        }
    }

    private GetFirstValidHit(hits: RayCastHit[]): RayCastHit {  
        for (let i = 0; i < hits.length; i++) {
            const hit = hits[i];
            if (hit.collider.getSceneObject() !== this.interactable.getSceneObject()) {
                return hit;
            }
        }
        return null;
    }

    private reportLocation(force : boolean = false) {
        if (this.lastPose !== null) {
            if(this.reportCount++ < 10 && !force) {
                return;
            }
            if(this.autoStop) {
                this.stop();
            }
            this.reportCount = 0;
            print("Reporting location "+ this.lastPose.position.toString());
            this.onLocationDeterminedEvent.invoke(this.lastPose);
        }
    }

    onHitTestResult(hit: RayCastHit, camforward: vec3, cameraPosition: vec3) {
        if (hit === null) {
            this.processHitResult(false);
        } else {
            if (1 - Math.abs(hit.normal.normalize().dot(vec3.up())) < this.EPSILON &&
                cameraPosition.y - hit.position.y > this.MIN_VERTICAL_DISTANCE) {
                this.processHitResult(true);
                const toRotation = quat.lookAt(new vec3(camforward.x, 0, camforward.z).normalize(), vec3.up());
                this.locationDisplayerTransform.setWorldPosition(hit.position.add(new vec3(0, 5, 0)));
                this.locationDisplayerTransform.setWorldRotation(toRotation);
            } else {
                this.processHitResult(false);
            }
        }
    }

    private processHitResult(isHit: boolean, force: boolean = false) {
        if (!this.isActive) {
            return;
        }
        if (isHit) {
            this.hitFailureCount = 0;
        }
        else {
            this.hitFailureCount++;
            if (this.hitFailureCount < 10 && !force) {
                return;
            }
        }
        this.locationDisplayer.enabled = isHit;
        this.lookDownIndicator.enabled = !isHit;
        this.lastPose = isHit ? Pose.fromTransform(this.locationDisplayerTransform) : null;
    }
}
