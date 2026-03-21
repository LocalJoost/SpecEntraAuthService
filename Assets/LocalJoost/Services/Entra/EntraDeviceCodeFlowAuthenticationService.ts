import { IDeviceCodeResponse } from "./IDeviceCodeResponse";
import { ITokenResponse, ITokenError } from "./TokenResponses";
import { DeviceCodeExpiredError, AccessDeniedError, TokenRequestError } from "./EntraDeviceCodeExceptions";
import { IEntraDeviceCodeFlowAuthenticationService } from "./IEntraDeviceCodeFlowAuthenticationService";
import { AccessToken } from "./AccessToken";
import { FormParams, FormParamUtils } from "LocalJoost/Utils/FormParam";
import { IHttpResult } from "LocalJoost/Utils/IHttpResult";
import { AwaitableSleep } from "LocalJoost/Utils/AwaitableSleep";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { ITokenStore } from "./ITokenStore";

export class EntraDeviceCodeFlowAuthenticationService implements IEntraDeviceCodeFlowAuthenticationService {
    private static readonly OAUTH_PATH: string = "oauth2/v2.0";
    private static readonly ENTRA_HOST: string = "https://login.microsoftonline.com";
    private static readonly CONTENT_TYPE_FORM: string = "application/x-www-form-urlencoded";

    private readonly http: InternetModule = require("LensStudio:InternetModule");
    private readonly verbose: boolean;
    private readonly clientId: string;
    private readonly authority: string;
    private readonly scope: string;
    private active: boolean = false;
    private backoff: number = 5;
    private awaitableSleep: AwaitableSleep = new AwaitableSleep(); 
    private readonly tokenStore: ITokenStore;

    constructor(tenant: string, clientId: string, tokenStore: ITokenStore, verbose: boolean = false) {
        this.clientId = clientId;
        this.verbose = verbose;
        this.authority = `${EntraDeviceCodeFlowAuthenticationService.ENTRA_HOST}/${tenant}/${EntraDeviceCodeFlowAuthenticationService.OAUTH_PATH}`;
        this.scope = `api://${clientId}/user_impersonation offline_access`;
        this.tokenStore = tokenStore;
    }

    public async authenticate(): Promise<AccessToken> {
        let currentToken = this.tokenStore.getToken();
        if (currentToken) {
            this.trace("Existing token found, checking expiration");
            if (!currentToken.isExpired) {
                this.trace("Using cached access token");
                return currentToken;
            }
            else {
                currentToken = await this.refreshToken(currentToken.refreshToken);
                if (currentToken) {
                    this.tokenStore.setToken(currentToken);
                    return currentToken;
                }
            }
        }
        this.trace("No valid token available, starting new device code flow authentication");
        const deviceCodeResponse = await this.requestDeviceCode();
        this.trace(`User code: ${deviceCodeResponse.user_code}`);
        this.UserActionRequiredEvent.invoke(`Please go to ${deviceCodeResponse.verification_uri} and enter code: ${deviceCodeResponse.user_code}`);
        currentToken = await this.pollForToken(deviceCodeResponse.device_code);
        this.tokenStore.setToken(currentToken);
        return currentToken;
    }

    public readonly UserActionRequiredEvent: Event<string> = new Event<string>();

    public logout(): void {
        this.tokenStore.clearToken();
    }

    private async requestDeviceCode(): Promise<IDeviceCodeResponse> {
        const result: IHttpResult = await this.postAsync("devicecode", {
            client_id: this.clientId,
            scope: this.scope,
        });

        if (result.statusCode !== 200) {
            throw new TokenRequestError(
                `Device code request returned HTTP ${result.statusCode}`,
                result.body
            );
        }

        const parsed = JSON.parse(result.body) as IDeviceCodeResponse;
        this.trace(`Received user code: ${parsed.user_code}`);
        return parsed;
    }

    private async pollForToken(deviceCode: string): Promise<AccessToken> {
        this.active = true;
        this.backoff = 5;

        const tokenParams: FormParams = {
            client_id: this.clientId,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            device_code: deviceCode,
        };

        while (this.active) {
            this.trace("Polling for token...");
            const result: IHttpResult = await this.postAsync("token", tokenParams);
            const payload = JSON.parse(result.body);

            if (result.statusCode === 200) {
                this.halt();
                var tokenResponse = payload as ITokenResponse;
                return AccessToken.create(tokenResponse);
            }

            const tokenError = payload as ITokenError;

            switch (tokenError.error) {
                case "authorization_pending":
                    this.trace("Waiting for user to authorize...");
                    break;
                case "slow_down":
                    this.backoff += 5;
                    this.trace(`Increased polling interval to ${this.backoff}s`);
                    break;
                default:
                    this.handlePollingError(tokenError);
            }

            await this.awaitableSleep.sleep(this.backoff);
        }
        throw new TokenRequestError("Polling was cancelled");
    }

    private async refreshToken(refreshToken: string): Promise<AccessToken | null> {
        this.trace("Refreshing access token");
        const result: IHttpResult = await this.postAsync("token", {
            client_id: this.clientId,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            scope: this.scope,
        });

        if (result.statusCode !== 200) {
            this.trace(`Token refresh failed with HTTP ${result.statusCode}`);
            return null;
        }

        this.trace("Access token refreshed successfully");
        const tokenResponse = JSON.parse(result.body) as ITokenResponse;
        return AccessToken.create(tokenResponse);
    }

    private trace(message: string): void {
        if (this.verbose) {
            print(message);
        }
    }

    private postAsync(endpoint: string, params: FormParams): Promise<IHttpResult> {
        const httpRequest: RemoteServiceHttpRequest = RemoteServiceHttpRequest.create();
        httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;
        httpRequest.url = `${this.authority}/${endpoint}`;
        httpRequest.body = FormParamUtils.serializeForm(params);
        httpRequest.setHeader("Content-Type", EntraDeviceCodeFlowAuthenticationService.CONTENT_TYPE_FORM);

        return new Promise<IHttpResult>((resolve) => {
            this.http.performHttpRequest(httpRequest, (resp) => {
                resolve({ statusCode: resp.statusCode, body: resp.body });
            });
        });
    }

    private halt(): void {
        this.active = false;
        this.awaitableSleep.cancel();
    }

    private handlePollingError(tokenError: ITokenError): never {
        this.halt();
        switch (tokenError.error) {
            case "expired_token":
                throw new DeviceCodeExpiredError();
            case "access_denied":
                throw new AccessDeniedError();
            default:
                throw new TokenRequestError(
                    "Token request failed",
                    tokenError.error_description ?? tokenError.error
                );
        }
    }
}