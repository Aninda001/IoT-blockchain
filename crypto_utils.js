import crypto from "node:crypto";
import { promisify } from "node:util";

// Create a promise-based version of generateKeyPair
const generateKeyPairAsync = promisify(crypto.generateKeyPair);
// Generate a static ECDH key pair (P-256 curve)
export const EC_key_pair = async () => {
    const { publicKey, privateKey } = await generateKeyPairAsync("ec", {
        namedCurve: "P-256", // Common curve (secp256r1)
        publicKeyEncoding: { type: "spki", format: "pem" }, // Public key in PEM format
        privateKeyEncoding: { type: "pkcs8", format: "pem" }, // Private key in PEM format
    });
    // console.log(publicKey, privateKey);
    return { publicKey, privateKey };
};

// Helper function to convert PEM to DER Buffer
function pemToDer(keyPem, isPrivate) {
    const key = isPrivate
        ? crypto.createPrivateKey(keyPem)
        : crypto.createPublicKey(keyPem);
    return key.export({ format: "der", type: isPrivate ? "pkcs8" : "spki" });
}

export const deriveSharedSecret = async (
    privateKeyPem, // Private key in PEM format
    theirPublicKeyPem, // Public key in PEM format
) => {
    // Convert PEM strings to DER buffers
    const privateKeyDer = pemToDer(privateKeyPem, true);
    const theirPublicKeyDer = pemToDer(theirPublicKeyPem, false);

    // Import private key
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyDer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"],
    );

    // Import their public key
    const theirPublicKey = await crypto.subtle.importKey(
        "spki",
        theirPublicKeyDer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        [],
    );

    // Derive the shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        {
            name: "ECDH",
            public: theirPublicKey,
        },
        privateKey,
        256,
    );

    return new Uint8Array(sharedSecret);
};

export function deriveAESKeyAndNonce(sharedSecretBuffer, salk, infi) {
    // Convert salt and info strings to Buffers
    const salt = Buffer.from(salk);
    const info = Buffer.from(infi);

    console.log("Salt:", salt.toString("hex"));
    console.log("Info:", info.toString("hex"));
    // Derive key material using HKDF with SHA-256
    const keyMaterial = crypto.hkdfSync(
        "sha256",
        sharedSecretBuffer, // Input keying material (shared secret)
        salt,
        info,
        32, // 32 bytes (256 bits) total
    );

    // Ensure keyMaterial is a Buffer (not an ArrayBuffer)
    const keyBuffer = Buffer.isBuffer(keyMaterial)
        ? keyMaterial
        : Buffer.from(keyMaterial);

    // Extract AES key (16 bytes) and nonce (12 bytes)
    const aesKey = Buffer.from(keyBuffer.slice(0, 16));
    const nonce = Buffer.from(keyBuffer.slice(16, 28));

    return { aesKey, nonce };
}

export function aesGcmEncrypt(aesKey, nonce, plaintext) {
    // Create a cipher with AES-128-GCM (since the key is 16 bytes)
    const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, nonce);

    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    return { ciphertext, tag };
}

export function aesGcmDecrypt(aesKey, nonce, ciphertext, tag) {
    const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, nonce);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    return plaintext;
}

// Sign data using ECDSA (DER format signature)
export function signData(privateKeyPem, dataToSign) {
    const signer = crypto.createSign("SHA256");
    signer.update(dataToSign);
    return signer.sign(privateKeyPem); // Returns DER-formatted signature buffer
}

// Verify ECDSA signature
export function verifySignature(publicKeyPem, dataToVerify, signature) {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(dataToVerify);
    return verifier.verify(publicKeyPem, signature); // Returns boolean
}
