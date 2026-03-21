import { LSTween } from "LSTween.lspkg/LSTween";
import { RotationInterpolationType } from "LSTween.lspkg/RotationInterpolationType";
import Tween from "LSTween.lspkg/TweenJS/Tween";
@component
export class Rotator extends BaseScriptComponent {

@input targetObject: SceneObject;
@input rotationSpeed: number = 300;
@input rotationAxisAndDirection: vec3 = new vec3(0,0 ,180);

private rotation: Tween
    onAwake() {
        this.createEvent("OnDestroyEvent").bind(() => {
            this.onDestroy();
        });
        this.rotation = LSTween.rotateFromToLocal(
            this.targetObject.getTransform(),
            quat.quatIdentity(),
            quat.fromEulerAngles(this.rotationAxisAndDirection.x,this.rotationAxisAndDirection.y,this.rotationAxisAndDirection.z),
            this.rotationSpeed,
            RotationInterpolationType.LERP
        ).repeat(Infinity)
            .start();
    }

    onDestroy() {
        this.rotation.stop();
    }
}
