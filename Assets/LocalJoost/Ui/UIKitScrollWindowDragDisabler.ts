import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

@component
export class UIKitScrollWindowDragDisabler extends BaseScriptComponent {
  
    onAwake() {
        if(global.deviceInfoSystem.isEditor){
            return
        }
        this.tryGetInteractable();
    }

    private tryGetInteractable(attempts: number = 0): void {
        const interactable = this.getSceneObject().getComponent(Interactable.getTypeName()) as Interactable;
        if (interactable) {
            this.updateInteractableProperties(interactable);
        } else if (attempts < 10) { // Max 10 attempts
            const delayedEvent = this.createEvent("DelayedCallbackEvent");
            delayedEvent.bind(() => this.tryGetInteractable(attempts + 1));
            delayedEvent.reset(0.1); // Wait 100ms between attempts
        } else {
            print("UIKitButtonController: Failed to find Interactable component after 10 attempts");
        }
    }

    private updateInteractableProperties(interactable: Interactable): void {
        interactable.enabled=false;
    }

}
