import { AccessToken } from "./AccessToken";
import { ITokenStore } from "./ITokenStore";

export class PersistentStorageTokenStore implements ITokenStore {
    private store: GeneralDataStore = global.persistentStorageSystem.store;
    private readonly tokenKey: string = "access_token";

    getToken(): AccessToken | null {
        const token = this.store.getString(this.tokenKey);
        if (token) {
            return AccessToken.fromJSON(JSON.parse(token));
        }
        return null;
    }

    setToken(token: AccessToken): void {
        this.store.putString(this.tokenKey, JSON.stringify(token));
    }

    clearToken(): void {
        this.store.remove(this.tokenKey);
    }
}