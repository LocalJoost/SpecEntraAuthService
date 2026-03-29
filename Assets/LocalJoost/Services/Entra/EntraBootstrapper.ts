import { ServiceManager } from "LocalJoost/Services/ServiceManager";
import { EntraDeviceCodeFlowAuthenticationService } from "./EntraDeviceCodeFlowAuthenticationService";
import { IEntraDeviceCodeFlowAuthenticationService } from "./IEntraDeviceCodeFlowAuthenticationService";
import { EncryptedPersistentStorageTokenStore } from "./EncryptedPersistentStorageTokenStore";

@component
export class EntraBootstrapper extends BaseScriptComponent {
    @input private tenantId: string;
    @input private clientId: string;

    onAwake() {
        var serviceManager = ServiceManager.getInstance();
        var entraService = new EntraDeviceCodeFlowAuthenticationService(
            this.tenantId, this.clientId, new EncryptedPersistentStorageTokenStore(), true);
        serviceManager.register(IEntraDeviceCodeFlowAuthenticationService, entraService);
    }
}
