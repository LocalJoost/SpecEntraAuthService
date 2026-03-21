export class NotificationMessage {
    public messageText: string;
    public timeoutSeconds: number;
    public isError: boolean;
    public showCloseButton: boolean;

    constructor(message: string, timeout: number = 0, isError: boolean = false, showCloseButton: boolean = false) {
        this.messageText = message
        this.timeoutSeconds = timeout;
        this.isError = isError;
        this.showCloseButton = showCloseButton;
    }
}
