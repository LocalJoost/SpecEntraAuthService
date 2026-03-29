import * as CryptoJS from "./crypto-js/crypto-js";

export default class AESEncryptionHandler
{ 
    private static parseKeyOrIv(value: string) {
        if (value.startsWith("hex:")) {
            return CryptoJS.enc.Hex.parse(value.substring(4));
        }
        return CryptoJS.enc.Utf8.parse(value);
    }

    public static encrypt(plainText: string, key: string, iv: string): string {
        try {
            const parsedKey = AESEncryptionHandler.parseKeyOrIv(key);
            const parsedIv = AESEncryptionHandler.parseKeyOrIv(iv);
            const encrypted = CryptoJS.AES.encrypt(
                CryptoJS.enc.Utf8.parse(plainText),
                parsedKey,
                {
                    iv: parsedIv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                }
            );
            return encrypted.ciphertext.toString();
        } catch (error) {
            print("Encryption error: " + error);
            return null;
        }
    }

    public static decrypt(encryptedText: string, key: string, iv: string): string {
        try {
            const parsedKey = AESEncryptionHandler.parseKeyOrIv(key);
            const parsedIv = AESEncryptionHandler.parseKeyOrIv(iv);
            const decrypted = CryptoJS.AES.decrypt(
                {
                    ciphertext: CryptoJS.enc.Hex.parse(encryptedText)
                },
                parsedKey,
                {
                    iv:  parsedIv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                }
            );

            // Convert the decrypted data to a UTF8 string
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            print("Decryption error: " + error); 
            return null;
        }
    }

    /**
     * Encrypts plainText using a pincode.
     * Generates a random salt (16 bytes) and IV (16 bytes), derives a 256-bit key
     * via PBKDF2, and returns the result as: salt (32 hex) + iv (32 hex) + ciphertext (hex).
     */
    public static encryptWithPin(plainText: string, pin: string): string {
        try {
            const salt = CryptoJS.lib.WordArray.random(16);
            const iv = CryptoJS.lib.WordArray.random(16);

            const key = CryptoJS.PBKDF2(pin, salt, {
                keySize: 256 / 32,
                iterations: 1000
            });

            const ivHex = iv.toString();
            const encryptedCiphertext = AESEncryptionHandler.encrypt(
                plainText,
                "hex:" + key.toString(),
                "hex:" + ivHex
            );
            if (!encryptedCiphertext) {
                return null;
            }

            // Format: salt (32 hex chars) + iv (32 hex chars) + ciphertext (hex)
            return salt.toString() + ivHex + encryptedCiphertext;
        } catch (error) {
            print("Encryption error: " + error);
            return null;
        }
    }

    /**
     * Decrypts a string produced by encryptWithPin.
     * Extracts salt and IV from the front, derives the same key via PBKDF2,
     * and delegates AES decryption to decrypt.
     */
    public static decryptWithPin(encryptedText: string, pin: string): string {
        try {
            // Extract salt (first 32 hex chars = 16 bytes), IV (next 32), and ciphertext (rest)
            const salt = CryptoJS.enc.Hex.parse(encryptedText.substring(0, 32));
            const ivHex = encryptedText.substring(32, 64);
            const ciphertextHex = encryptedText.substring(64);

            const key = CryptoJS.PBKDF2(pin, salt, {
                keySize: 256 / 32,
                iterations: 1000
            });

            return AESEncryptionHandler.decrypt(
                ciphertextHex,
                "hex:" + key.toString(),
                "hex:" + ivHex
            );
        } catch (error) {
            print("Decryption error: " + error);
            return null;
        }
    }

    public static test(): void {
        const pin = "123456";
        const originalText = "Hello, this is a test!";

        const encrypted = AESEncryptionHandler.encryptWithPin(originalText, pin);
        print("Encrypted: " + encrypted);

        const decrypted = AESEncryptionHandler.decryptWithPin(encrypted, pin);
        print("Decrypted: " + decrypted);

        if (decrypted === originalText) {
            print("SUCCESS: Round-trip pin-based encryption/decryption works correctly.");
        } else {
            print("FAILURE: Decrypted text does not match original.");
            print("Expected: " + originalText);
            print("Got: " + decrypted);
        }

        // Verify wrong pin returns null instead of crashing
        const wrongDecrypt = AESEncryptionHandler.decryptWithPin(encrypted, "9999999");
        if (wrongDecrypt === null || wrongDecrypt === "") {
            print("SUCCESS: Wrong pin correctly fails to decrypt.");
        } else {
            print("FAILURE: Wrong pin should not decrypt successfully. Got: " + wrongDecrypt);
        }
    }
}