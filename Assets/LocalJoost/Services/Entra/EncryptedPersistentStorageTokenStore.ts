import AESEncryptionHandler from "LocalJoost/Security/AESEncryptionHandler";
import { AccessToken } from "./AccessToken";
import { ITokenStore } from "./ITokenStore";
import { IPincodeRequestService } from "./IPincodeRequestService";
import { ServiceManager } from "../ServiceManager";

export class EncryptedPersistentStorageTokenStore implements ITokenStore {
    private store: GeneralDataStore = global.persistentStorageSystem.store;
    private readonly tokenKey: string = "encrypted_access_token";
    private pinCode = ""
    private pinCodeRequestServiceCache: IPincodeRequestService;
    private readonly maxRetries : number = 3;

    public async getToken(): Promise<AccessToken | null> {
        const token = await this.getEncryptedTokenFromStore();
        if (token) {
            return AccessToken.fromJSON(JSON.parse(token));
        }
        return null;
    }

    public async setToken(token: AccessToken): Promise<void> {
        if(!this.pinCode) {
            this.pinCode = await this.pinCodeRequestService.askForPinCode(true);
        }
        var encryptedToken = AESEncryptionHandler.encryptWithPin(JSON.stringify(token), this.pinCode);
        this.store.putString(this.tokenKey, encryptedToken);
    }

    public async clearToken(): Promise<void> {
        this.store.remove(this.tokenKey);
        this.pinCode = "";
    }

    private get pinCodeRequestService(): IPincodeRequestService {
        if (!this.pinCodeRequestServiceCache) {
            this.pinCodeRequestServiceCache = ServiceManager.getInstance().get(IPincodeRequestService);
        }
        return this.pinCodeRequestServiceCache;
    }
    
    private async getEncryptedTokenFromStore(): Promise<string> {
        const encryptedToken = this.store.getString(this.tokenKey);
        print(`Retrieved encrypted token: ${encryptedToken}`);
        if (!encryptedToken) {
            return null;
        }
        var retries: number = this.maxRetries + 1;

        var unencryptedCode : string
        while (!unencryptedCode && retries > 0) {
            if(!this.pinCode) {
                this.pinCode = await this.pinCodeRequestService.askForPinCode(false);
            }
            unencryptedCode = AESEncryptionHandler.decryptWithPin(encryptedToken, this.pinCode);
            if(!unencryptedCode) {
                this.pinCode = "";
            }
            retries--;
            if( retries === 0) {
                this.clearToken();
                throw new Error("Maximum retries reached. Please re-authenticate the device.");
            }
        }
        return unencryptedCode;
    }
}