import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { AccessToken } from "./AccessToken";

export
interface IEntraDeviceCodeFlowAuthenticationService {
    authenticate(): Promise<AccessToken>;
    UserActionRequiredEvent: Event<string>;
    logout(): void
}

export function IEntraDeviceCodeFlowAuthenticationService() {}