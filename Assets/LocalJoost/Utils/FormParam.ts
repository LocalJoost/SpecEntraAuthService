export type FormParams = Record<string, string>;

export class FormParamUtils {
    public static serializeForm(params: FormParams): string {
        const parts: string[] = [];
        for (const key of Object.keys(params)) {
            parts.push(`${key}=${encodeURIComponent(params[key])}`);
        }
        return parts.join("&");
    }
}