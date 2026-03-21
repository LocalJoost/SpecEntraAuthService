import { AccessToken } from "./AccessToken";

export 
interface ITokenStore {
    getToken(): AccessToken | null;
    setToken(token: AccessToken): void;
    clearToken(): void;
}