import { AccessToken } from "./AccessToken";

export 
interface ITokenStore {
    getToken(): Promise<AccessToken | null>
    setToken(token: AccessToken): Promise<void>;
    clearToken(): Promise<void>;
}