export class DeviceCodeExpiredError extends Error {
    constructor(message: string = "Device code expired. Please start authentication again.") {
        super(message);
        this.name = "DeviceCodeExpiredError";
    }
}

export class AccessDeniedError extends Error {
    constructor(message: string = "User denied the authentication request.") {
        super(message);
        this.name = "AccessDeniedError";
    }
}

export class TokenRequestError extends Error {
    constructor(message: string, public readonly details?: string) {
        super(message);
        this.name = "TokenRequestError";
    }
}