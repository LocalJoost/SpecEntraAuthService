import StringUtils from "LocalJoost/Utils/StringUtils";
import { ITokenResponse, ITokenData } from "./TokenResponses";

export class AccessToken {
    public accessToken: string;
    public refreshToken: string;
    public expiration: number;
    public userName: string;
    public oid: string;

    public static create(tokenResponse: ITokenResponse): AccessToken {
        const token = new AccessToken();
        token.accessToken = tokenResponse.access_token;
        token.refreshToken = tokenResponse.refresh_token;
        token.expiration = Date.now() / 1000 + tokenResponse.expires_in;
        var tokenData = this.getTokenDataFromAccessToken(tokenResponse.access_token);
        token.userName = tokenData.name;
        token.oid = tokenData.oid;
        return token;
    }

    public static fromJSON(json: object): AccessToken {
        const token = new AccessToken();
        Object.assign(token, json);
        return token;
    }

    public get isExpired(): boolean {
        return Date.now() / 1000 >= this.expiration;
    }

    private static getTokenDataFromAccessToken(accessToken: string): ITokenData {
        const splitToken: string[] = accessToken.split('.');
        const correctedBase64: string = StringUtils.base64UrlToBase64String(splitToken[1]);
        const decoded: string = StringUtils.base64Decode(correctedBase64);
        const tokenData: ITokenData = JSON.parse(decoded);
        return tokenData;
    }
}