// Import the readline module
import * as readline from "readline";
import {
    EC_key_pair,
    deriveSharedSecret,
    deriveAESKeyAndNonce,
    aesGcmEncrypt,
    aesGcmDecrypt,
} from "./crypto_utils.js";
import config from "./config.js";

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const salt = "uplink_salt";
const info = "uplink_key_derivation";
const { publicKey: staticPublicKey, privateKey: staticPrivateKey } =
    await EC_key_pair();
const { publicKey: SigPublicKey, privateKey: SigPrivateKey } =
    await EC_key_pair();
config.staticpubiot = staticPublicKey;
config.sigpubiot = SigPublicKey;

async function getChoice(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (input) => resolve(input));
    });
}
const choise = async () => {
    console.log("1. Send a message");
    console.log("2. Received messages");
    console.log("3. Exit");
    const choice = await getChoice("Choose an option: ");
    return choice.trim();
};

const send_msg = async () => {
    let msg = await getChoice("Enter a message: ");
    console.log(`You entered: ${msg}`);

    const { privateKey: ephemeralPrivateKey, publicKey: ephemeralPublicKey } =
        await EC_key_pair();
    config.reload();
    let sharedSecret = await deriveSharedSecret(
        ephemeralPrivateKey,
        config.staticpubbase,
    );
    // After deriving the shared secret
    console.log("SHARED SECRET:", sharedSecret.toString("hex"));
    const { aesKey: aes_key, nonce } = deriveAESKeyAndNonce(
        sharedSecret,
        salt,
        info,
    );
    console.log(aes_key, nonce);
    const { ciphertext, tag } = aesGcmEncrypt(aes_key, nonce, msg);
    const payload = {
        ephemeralPublicKey: ephemeralPublicKey.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        tag: tag.toString("base64"),
    };
    console.log(payload);
    await fetch("http://localhost:10000/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
};

const main = async () => {
    while (true) {
        let option = await choise();
        switch (option) {
            case "1":
                await send_msg();
                break;
            case "2":
                received_msg();
                break;
            case "3":
                rl.close();
                console.log("Exiting...");
                return;
            default:
                console.log("No matching option.\n Choose again.");
        }
    }
};

main();

import express from "express";
const app = express();
const port = 9999;

// Parse text body
app.use(express.json());

app.get("/", (req, res) => {
    res.send("OK");
});

app.post("/msg", async (req, res) => {
    const body = req.body;
    console.log(body);
    const sharedSecret = await deriveSharedSecret(
        staticPrivateKey,
        body.ephemeralPublicKey,
    );
    // After deriving the shared secret
    console.log("SHARED SECRET:", sharedSecret.toString("hex"));
    const { aesKey: aes_key, nonce } = deriveAESKeyAndNonce(
        sharedSecret,
        salt,
        info,
    );
    console.log(aes_key, nonce);
    const ciphertextBuffer = Buffer.from(body.ciphertext, "base64");
    const tagBuffer = Buffer.from(body.tag, "base64");
    const msg = aesGcmDecrypt(aes_key, nonce, ciphertextBuffer, tagBuffer);
    console.log("\n", msg.toString("utf-8"));
    res.status(200).send("200 Ok");
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
