import { ethers } from "ethers";
// blockchain_utils.cjs
import MessageRewardArtifact from './artifacts/contracts/MessageReward.sol/MessageReward.json' with{ type: 'json' };
import config from "./config.js"; // Use simplified config

// --- Ethers.js Setup ---
const provider = new ethers.JsonRpcProvider(config.RPC_URL);

function getWallet(privateKey) {
    if (!privateKey || privateKey.startsWith('YOUR_')) {
        console.error("!!! ETH Private key not configured correctly in config/env !!!");
        // For prototyping, maybe return null or a default unusable key?
        // Returning null is safer to force config correction.
        return null;
        // throw new Error("Private key not configured correctly."); // Or throw error
    }
    try {
        return new ethers.Wallet(privateKey, provider);
    } catch (e) {
         console.error(`!!! Failed to create wallet from private key: ${e.message} !!!`);
         return null; // Fail gracefully for prototype
    }
}

function getContractInstance(signerOrProvider) {
     const contractAddress = config.MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS;
     if (!contractAddress || contractAddress.startsWith('YOUR_')) {
        console.error("!!! Contract address not configured correctly in config/env !!!");
        return null;
        // throw new Error("Contract address not configured correctly.");
    }
    return new ethers.Contract(contractAddress, MessageRewardArtifact.abi, signerOrProvider);
}

// --- Hashing (Consistent with Solidity keccak256) ---
function calculateMessageHash(messageContent) {
    // Hash the raw UTF8 bytes of the message string
    const messageBytes = ethers.toUtf8Bytes(messageContent);
    const hash = ethers.keccak256(messageBytes);
    // console.log(`Calculated hash for "${messageContent}": ${hash}`); // Debug logging
    return hash;
}

// --- Ethereum-Style Signing ---
async function signEthereumMessageHash(privateKey, messageHash) {
    const wallet = getWallet(privateKey);
    if (!wallet) {
        console.error("Cannot sign: Wallet could not be created (check private key config).");
        return null; // Fail gracefully
    }
    if (!ethers.isHexString(messageHash, 32)) {
        console.error(`Cannot sign: Invalid message hash format: ${messageHash}`);
        return null;
    }
    // console.log(`Wallet ${await wallet.getAddress()} signing hash: ${messageHash}`); // Debug logging
    try {
        // ethers.signMessage prefixes and hashes automatically
        const signature = await wallet.signMessage(ethers.getBytes(messageHash)); // Sign the raw bytes of the hash
        // console.log(`Generated signature: ${signature}`); // Debug logging
        return signature;
    } catch (error) {
        console.error("Error signing Ethereum message hash:", error);
        return null; // Fail gracefully
    }
}

export {
    provider,
    getWallet,
    getContractInstance,
    calculateMessageHash,
    signEthereumMessageHash
};
