// config.js
import { readFileSync } from "fs";
import { writeFile } from "fs/promises"; // Correctly import from fs/promises
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv'; // Use dotenv for keys

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "config.json");

// Default configuration
const DEFAULT_CONFIG = {
    sigpubiot: "",
    sigpubbase: "",
    staticpubiot: "",
    staticpubbase: "",

    BASE_STATION_ETH_ADDRESS: process.env.BASE_STATION_ETH_ADDRESS || "YOUR_BASE_STATION_ETH_ADDRESS",
    IOT_DEVICE_ETH_ADDRESS: process.env.IOT_DEVICE_ETH_ADDRESS || "YOUR_IOT_DEVICE_ETH_ADDRESS",
    // Private keys needed for signing ACKs
    BASE_STATION_ETH_PRIVATE_KEY: process.env.BASE_STATION_ETH_PRIVATE_KEY || "YOUR_BASE_STATION_ETH_PK",
    IOT_DEVICE_ETH_PRIVATE_KEY: process.env.IOT_DEVICE_ETH_PRIVATE_KEY || "YOUR_IOT_DEVICE_ETH_PK",
    // Intermediary needs key to call claimReward
    INTERMEDIARY_ETH_PRIVATE_KEY: process.env.INTERMEDIARY_ETH_PRIVATE_KEY || "YOUR_INTERMEDIARY_ETH_PK",
    // Contract info
    MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS: process.env.MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS",
    RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545", // Default to local Hardhat node

    lastUpdated: new Date().toISOString(),
    updatedBy: "Aninda001",
};

const current_Blockchain_Config = () => {
    return {
        BASE_STATION_ETH_ADDRESS: process.env.BASE_STATION_ETH_ADDRESS || "YOUR_BASE_STATION_ETH_ADDRESS",
        IOT_DEVICE_ETH_ADDRESS: process.env.IOT_DEVICE_ETH_ADDRESS || "YOUR_IOT_DEVICE_ETH_ADDRESS",
        // Private keys needed for signing ACKs
        BASE_STATION_ETH_PRIVATE_KEY: process.env.BASE_STATION_ETH_PRIVATE_KEY || "YOUR_BASE_STATION_ETH_PK",
        IOT_DEVICE_ETH_PRIVATE_KEY: process.env.IOT_DEVICE_ETH_PRIVATE_KEY || "YOUR_IOT_DEVICE_ETH_PK",
        // Intermediary needs key to call claimReward
        INTERMEDIARY_ETH_PRIVATE_KEY: process.env.INTERMEDIARY_ETH_PRIVATE_KEY || "YOUR_INTERMEDIARY_ETH_PK",
        // Contract info
        MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS: process.env.MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS",
        RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545", // Default to local Hardhat node


    };
}


// Try to load config synchronously at startup
function loadConfigSync() {
    let blockchainConfig = current_Blockchain_Config();
    try {
        const data = readFileSync(CONFIG_FILE, "utf8");
        return { ...DEFAULT_CONFIG, ...JSON.parse(data), ...blockchainConfig };
    } catch (error) {
        // If file doesn't exist, create it with defaults
        if (error.code === "ENOENT") {
            const configStr = JSON.stringify(DEFAULT_CONFIG, null, 2);
            try {
                // Use synchronous write to ensure file exists immediately
                const fs = require("fs");
                fs.writeFileSync(CONFIG_FILE, configStr, "utf8");
                console.log("Created new config file with defaults");
                return { ...DEFAULT_CONFIG };
            } catch (writeError) {
                console.error("Failed to create config file:", writeError);
                return { ...DEFAULT_CONFIG };
            }
        } else {
            console.error("Error loading config file:", error);
            return { ...DEFAULT_CONFIG };
        }
    }
}

// Add this function
function reloadConfig() {
    let blockchainConfig = current_Blockchain_Config();
    try {
        const data = readFileSync(CONFIG_FILE, "utf8");
        configData = { ...DEFAULT_CONFIG, ...JSON.parse(data), ...blockchainConfig };
        console.log("Config reloaded from disk");
        return true;
    } catch (error) {
        console.error("Error reloading config:", error);
        return false;
    }
}

// Load config at startup
let configData = loadConfigSync();

// Queue for saving operations
let saveQueue = Promise.resolve();
// Save config to file (asynchronously)
function saveConfig() {
    // Queue the save operation to prevent race conditions
    saveQueue = saveQueue.then(async () => {
        try {
            // Update metadata
            configData.lastUpdated = new Date().toISOString();
            configData.updatedBy = "Aninda001";

            // Write to file (corrected usage)
            await writeFile(
                CONFIG_FILE,
                JSON.stringify(configData, null, 2),
                { encoding: "utf8" }, // Use an options object instead of string
            );
            return true;
        } catch (error) {
            console.error("Error saving config:", error);
            return false;
        }
    });

    // Return the promise for those who want to await it
    return saveQueue;
}

// Create the config proxy
const config = new Proxy(
    {},
    {
        // Handle property access
        get(target, prop) {
            // Return methods directly
            if (prop === "save") return saveConfig;
            if (prop === "getData") return () => ({ ...configData });
            if (prop === "reload") return reloadConfig; // Add this line
            // Return the config property value
            return configData[prop];
        },

        // Handle property assignment
        set(target, prop, value) {
            // Update the in-memory config
            configData[prop] = value;

            // Save changes to file (don't wait for it to complete)
            saveConfig();

            return true;
        },
    },
);

export default config;


// export const BLOCKCHAIN_CONFIG_SIMPLE = {
//     RPC_URL: configData.RPC_URL,
//     CONTRACT_ADDRESS: configData.MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS,
//     BASE_STATION_ETH_PRIVATE_KEY: configData.BASE_STATION_ETH_PRIVATE_KEY,
//     IOT_DEVICE_ETH_PRIVATE_KEY: configData.IOT_DEVICE_ETH_PRIVATE_KEY,
//     INTERMEDIARY_ETH_PRIVATE_KEY: configData.INTERMEDIARY_ETH_PRIVATE_KEY,
// };

