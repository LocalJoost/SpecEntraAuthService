export default class StringUtils {

    public static appendUrlParameters(source: string, parameters: string): string {
        if (source.indexOf('?') === -1) {
            return source + '?' + parameters;
        } else {
            return source + '&' + parameters;
        }
    }

    public static base64Encode(str: string): string {
        return Base64.encode(this.stringToUint8Array(str));
    }

    public static base64Decode(encoded: string): string {
        const decodedBytes = Base64.decode(encoded);
        return this.uint8ArrayToString(decodedBytes);
    }


    public static stringToUint8Array(str: string): Uint8Array {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
        }
        return arr;
    }

    public static uint8ArrayToString(arr: Uint8Array): string {
        let str = '';
        for (let i = 0; i < arr.length; i++) {
            str += String.fromCharCode(arr[i]);
        }
        return str;
    }

public static base64UrlToBase64String(raw: string): string {
    let result = raw.replace(/-/g, '+').replace(/_/g, '/');
    let padding: number = result.length % 4;
    if (padding > 0) {
        padding = 4 - padding;
    }
    return result + '='.repeat(padding);
}
}