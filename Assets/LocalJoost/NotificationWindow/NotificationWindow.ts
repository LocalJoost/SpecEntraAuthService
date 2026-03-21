import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";
import { CancelToken, clearTimeout, setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { NotificationMessage } from "./NotificationMessage";

@component
export class NotificationWindow extends BaseScriptComponent {
    @input closeButton: BaseButton;
    @input displayText: Text;
    @input displayWindow: SceneObject;
    @input errorIcon: SceneObject;
    @input infoIcon: SceneObject;
    @input errorAudioSource: AudioComponent;
    @input uiSoundAudioSource: AudioComponent;

    private timeoutId: CancelToken
    private onNotificationClosedInternal = new Event<void>();
    private onNotificationOpenedInternal = new Event<void>();

    onAwake() {
        this.displayWindow.enabled = false;
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(async () => {
            this.initialize();
        });
        delayedEvent.reset(0.25);
    }

    public showNotification(message: NotificationMessage): void {
        if( message == null || message.messageText == null || message.messageText.length == 0 ){
            this.closeNotification();
            return;
        }
        this.displayText.text = message.messageText;
        this.closeButton.getSceneObject().enabled = message.showCloseButton;
        this.errorIcon.enabled = message.isError;
        this.infoIcon.enabled = !message.isError;

        // Show the notification
        this.displayWindow.enabled = true;
        this.onNotificationOpenedInternal.invoke();
        if(message.isError)
        {
            this.errorAudioSource.play(1);
        }
        else
        {
            this.uiSoundAudioSource.play(1);
        }

        if (message.timeoutSeconds > 0) {
            // Hide the notification after the specified duration
            this.timeoutId = setTimeout(() => {
                this.closeNotification();
            }, message.timeoutSeconds * 1000);
        }
    }

    public closeNotification(): void {
        this.displayWindow.enabled = false;
        this.clearTimeout()
        this.timeoutId = null;
        this.onNotificationClosedInternal.invoke();
    }

    public get onNotificationClosed(): PublicApi<void> {
        return this.onNotificationClosedInternal.publicApi();
    }

    public get onNotificationOpened(): PublicApi<void> {
        return this.onNotificationOpenedInternal.publicApi();
    }

    private initialize(): void {
        this.closeButton.onTriggerUp.add(() => {
            const delayedEvent = this.createEvent("DelayedCallbackEvent");
            delayedEvent.bind(async () => {
                this.closeNotification();
            });
            delayedEvent.reset(0.25);
        });
    }

    private clearTimeout(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}
