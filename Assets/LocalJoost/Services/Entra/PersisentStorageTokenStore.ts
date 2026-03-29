import { AccessToken } from "./AccessToken";
import { ITokenStore } from "./ITokenStore";

export class PersistentStorageTokenStore implements ITokenStore {
    private store: GeneralDataStore = global.persistentStorageSystem.store;
    private readonly tokenKey: string = "access_token";

    public async getToken(): Promise<AccessToken | null> {
        const token = this.store.getString(this.tokenKey);
        if (token) {
            print(`Retrieved token: ${token}`);
            return AccessToken.fromJSON(JSON.parse(token));
        }
        print(`NOT Retrieved token: ${token}`);
        return null;
    }

    public async setToken(token: AccessToken): Promise<void> {
        this.store.putString(this.tokenKey, JSON.stringify(token));
    }

    public async clearToken(): Promise<void> {
        this.store.remove(this.tokenKey);
    }
}