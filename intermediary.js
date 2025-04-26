import express from "express";
import fetch from "node-fetch";
// Blockchain imports
import { ethers } from "ethers";
import config from "./config.js"; // Use simple config
import {
    getWallet as getEthWallet,
    getContractInstance,
} from "./blockchain_utils.js";
const app = express();
const port = 10000;

config.reload();
// --- Blockchain Setup ---
const intermediaryEthWallet = getEthWallet(config.INTERMEDIARY_ETH_PRIVATE_KEY);
const messageRewardContract = getContractInstance(intermediaryEthWallet); // Get contract instance with signer

if (!intermediaryEthWallet || !messageRewardContract) {
    console.error("!!! Failed to initialize Intermediary ETH wallet or contract instance. Check config/env and RPC URL. Exiting. !!!");
    process.exit(1); // Exit if essential blockchain setup fails
} else {
     console.log(`Intermediary Ethereum Address: ${await intermediaryEthWallet.getAddress()}`);
     console.log(`Using MessageRewardSimple Contract: ${await messageRewardContract.getAddress()}`);
}


// Middleware to parse text bodies
app.use(express.json());

// Root route (GET /)
app.get("/", (req, res) => {
    res.status(200).send("OK");
});

// POST /base route
app.post("/base", async (req, res) => {
    try {
        const body = req.body;
        await fetch("http://localhost:10001/msg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        console.log(body);
        res.status(200).send("200 Ok");
    } catch (error) {
        console.error("Error in /base:", error);
        res.status(500).send("Internal Server Error");
    }
});

// POST /iot route
app.post("/iot", async (req, res) => {
    try {
        const body = req.body;
        console.log(body);
        await fetch("http://localhost:9999/msg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        res.status(200).send("200 Ok");
    } catch (error) {
        console.error("Error in /iot:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- NEW: POST /ack (Receives Hash + Signature, Claims Reward) ---
app.post("/ack", async (req, res) => {
    config.reload();
    const { messageHash, signature } = req.body;
    console.log(`Received ACK - Hash: ${messageHash}, Signature: ${signature}`);

    if (!messageHash || !signature || !ethers.isHexString(messageHash, 32) || !ethers.isHexString(signature)) {
        console.error("Invalid acknowledgement payload received (hash or signature missing/invalid).");
        return res.status(400).send("Missing or invalid messageHash or signature");
    }

    if (!messageRewardContract) {
         console.error("Cannot claim reward: Contract instance not available.");
         return res.status(500).send("Internal configuration error");
    }

    // Attempt to claim reward on the blockchain
    try {
        console.log(`Attempting to claim reward for hash: ${messageHash}`);
        // Ensure the contract instance has the intermediary's signer attached
        const tx = await messageRewardContract.claimReward(messageHash, signature);
        console.log(`Claim transaction sent: ${tx.hash}`);
        const receipt = await tx.wait(); // Wait for confirmation
        console.log(`Reward claimed successfully in block: ${receipt.blockNumber} for hash: ${messageHash}`);
        res.status(200).send("Reward claimed successfully");
    } catch (error) {
        // Catch potential errors from the contract (e.g., "Already claimed", "Invalid signature", "Signer not authorized", revert reasons)
        const revertReason = error.reason || (error.data ? ethers.toUtf8String(error.data) : null) || error.message;
        console.error(`Error claiming reward for hash ${messageHash}: ${revertReason}`);
        // Send a more informative error if possible
        res.status(500).send(`Failed to claim reward: ${revertReason}`);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
