import { ServiceManager } from "LocalJoost/Services/ServiceManager";
import { IEntraDeviceCodeFlowAuthenticationService } from "../IEntraDeviceCodeFlowAuthenticationService";
import { AccessToken } from "../AccessToken";
import { AwaitableSleep } from "LocalJoost/Utils/AwaitableSleep";
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";
import { TextInputField } from "SpectaclesUIKit.lspkg/Scripts/Components/TextInputField/TextInputField";
import { IPincodeRequestService } from "../IPincodeRequestService";

@component
export class EntraSampleUIWindow extends BaseScriptComponent {
    @input private displayFrame: SceneObject;
    @input private displayText: Text;
    @input private testApiUrl: string;
    @input private button: BaseButton;
    @input private pincodeInput: TextInputField;

    private entraService: IEntraDeviceCodeFlowAuthenticationService;
    private readonly http: InternetModule = require("LensStudio:InternetModule");
    private awaitableSleep: AwaitableSleep = new AwaitableSleep();

    onAwake() {
        var serviceManager = ServiceManager.getInstance();
        serviceManager.register(IPincodeRequestService, this);
        this.entraService = serviceManager.get(IEntraDeviceCodeFlowAuthenticationService);
        this.displayFrame.enabled = false;
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(async () => {
            this.button.sceneObject.enabled = false;
            this.pincodeInput.sceneObject.enabled = false;
            this.showMessage("Initializing...");
            this.displayFrame.enabled = true;

            this.button.onTriggerDown.add(async () => {
                this.entraService.logout();
                this.button.sceneObject.enabled = false;
                await this.demoAuthentication();
            });
            await this.demoAuthentication();
        });
        delayedEvent.reset(1);
    }

    public async askForPinCode(requireConfirm: boolean): Promise<string> {
        var validPinCodeObtained = false;
        this.pincodeInput.sceneObject.enabled = true;
        var pinCode: string = "";
        do {
            this.showMessage(requireConfirm ? "Please enter a PIN code to encrypt your token:" : "Please enter your PIN code to decrypt your token:");
            pinCode = await this.waitForInput();
            if (!requireConfirm) {
                validPinCodeObtained = true;
            }
            else {
                await this.awaitableSleep.sleep(0.25);
                this.showMessage("Please confirm your PIN code by entering it again:");
                var confirmPinCode = await this.waitForInput();
                if (pinCode !== confirmPinCode) {
                    this.showMessage("PIN codes do not match. Please try again.");
                    await this.awaitableSleep.sleep(3);
                } else {
                    validPinCodeObtained = true;
                }
            }
        }
        while (!validPinCodeObtained)
        await this.awaitableSleep.sleep(2);
        this.pincodeInput.sceneObject.enabled = false;
        return pinCode;
    }

    private async waitForInput(): Promise<string> {
        this.pincodeInput.text = "";
        this.enterTestPinCode();
        return new Promise((resolve) => {
            const handler = () => {
                const input = this.pincodeInput.text.trim();
                if (input.length >= 6) {
                    this.pincodeInput.onTextChanged.remove(handler);
                    global.textInputSystem.dismissKeyboard();
                    resolve(input);
                }
            };
            this.pincodeInput.onTextChanged.add(handler);
        });
    }

    private enterTestPinCode() : void {
        if (!global.deviceInfoSystem.isEditor()) return;
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(async () => {
            this.pincodeInput.text = "123456";
        });
        delayedEvent.reset(2);
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
