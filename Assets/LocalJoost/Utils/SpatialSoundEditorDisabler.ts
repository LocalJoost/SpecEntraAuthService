@component
export class SpatialSoundEditorDisabler extends BaseScriptComponent {
    onAwake() {
        var audioComponent = this.getSceneObject().getComponent("AudioComponent");
        if(audioComponent) {
            audioComponent.spatialAudio.enabled = !global.deviceInfoSystem.isEditor();
            audioComponent.spatialAudio.positionEffect.enabled = !global.deviceInfoSystem.isEditor();
            audioComponent.spatialAudio.distanceEffect.enabled = !global.deviceInfoSystem.isEditor();
        }

    }
}
