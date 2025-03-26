// config.js
import { readFileSync } from "fs";
import { writeFile } from "fs/promises"; // Correctly import from fs/promises
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, "config.json");

// Default configuration
const DEFAULT_CONFIG = {
    sigpubiot: "",
    sigpubbase: "",
    staticpubiot: "",
    staticpubbase: "",
    lastUpdated: new Date().toISOString(),
    updatedBy: "Aninda001",
};

// Queue for saving operations
let saveQueue = Promise.resolve();

// Try to load config synchronously at startup
function loadConfigSync() {
    try {
        const data = readFileSync(CONFIG_FILE, "utf8");
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
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
    try {
        const data = readFileSync(CONFIG_FILE, "utf8");
        configData = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        console.log("Config reloaded from disk");
        return true;
    } catch (error) {
        console.error("Error reloading config:", error);
        return false;
    }
}

// Load config at startup
let configData = loadConfigSync();

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
