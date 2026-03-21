import { setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";
import { clearTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";
import { CancelToken } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

export class AwaitableSleep {
    waitToken: CancelToken | null = null;
    public sleep(durationSeconds: number): Promise<void> {
        return new Promise<void>((done) => {
            this.waitToken = setTimeout(() => done(), durationSeconds * 1000);
        });
    }

    public cancel(): void {
        if (this.waitToken !== null) {
            clearTimeout(this.waitToken);
            this.waitToken = null;
        }
    }
}