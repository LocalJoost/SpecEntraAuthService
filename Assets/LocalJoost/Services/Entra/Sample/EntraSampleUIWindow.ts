import { ServiceManager } from "LocalJoost/Services/ServiceManager";
import { IEntraDeviceCodeFlowAuthenticationService } from "../IEntraDeviceCodeFlowAuthenticationService";
import { AccessToken } from "../AccessToken";
import { AwaitableSleep } from "LocalJoost/Utils/AwaitableSleep";
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";

@component
export class EntraSampleUIWindow extends BaseScriptComponent {
    @input private displayFrame: SceneObject;
    @input private displayText: Text;
    @input private testApiUrl: string;
    @input private button: BaseButton;

    private entraService: IEntraDeviceCodeFlowAuthenticationService;
    private readonly http: InternetModule = require("LensStudio:InternetModule");
    private awaitableSleep: AwaitableSleep = new AwaitableSleep();

    onAwake() {
        this.entraService = ServiceManager.getInstance().get(IEntraDeviceCodeFlowAuthenticationService);

        this.displayFrame.enabled = false;
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(async () => {
            this.button.sceneObject.enabled = false;
            this.button.onTriggerDown.add(() => 
                {
                    this.entraService.logout();
                    this.demoAuthentication();
                });
            await this.demoAuthentication();
        });
        delayedEvent.reset(3);
    }

    private async demoAuthentication(): Promise<void> {
        try {
            this.entraService.UserActionRequiredEvent.add((message: string) => {
                this.showMessage(message);
            });
            var token: AccessToken = await this.entraService.authenticate();
            this.showMessage(`Welcome ${token.userName}`);
            await this.awaitableSleep.sleep(4);

            this.showMessage(`Token valid until ${new Date(token.expiration * 1000)}`);
            await this.awaitableSleep.sleep(4);

            const httpRequest: RemoteServiceHttpRequest = RemoteServiceHttpRequest.create();
            httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Get;
            httpRequest.url = this.testApiUrl;
            httpRequest.setHeader("Authorization", `Bearer ${token.accessToken}`);
            this.http.performHttpRequest(httpRequest, (resp) => {
                this.showMessage(`Test url status code: ${resp.statusCode}`);
            });
            await this.awaitableSleep.sleep(4);

            // Intentionally expire the token to demonstrate refresh flow
            token.expiration = Date.now() / 1000;
            var newToken = await this.entraService.authenticate();
            this.showMessage(`Token refreshed. New expiration time: ${new Date(newToken.expiration * 1000)}`);
            await this.awaitableSleep.sleep(4);

            httpRequest.setHeader("Authorization", `Bearer ${newToken.accessToken}`);
            this.http.performHttpRequest(httpRequest, (resp) => {
                this.showMessage(`Test url status code after refresh: ${resp.statusCode}`);
            });

            this.button.sceneObject.enabled = true;
        } catch (e) {
            this.showMessage(`Authentication failed: ${e}`);
            return;
        }
    }

    public showMessage(message: string): void {
        this.displayText.text = message;
        print(`Display message: ${message}`);
        this.displayFrame.enabled = true;
    }

    public hideMessage(): void {
        this.displayFrame.enabled = false;
    }
}
