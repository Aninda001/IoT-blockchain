require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env file at the top

// Retrieve private keys and RPC URL from .env
const GANACHE_PRIVATE_KEY_1 = process.env.GANACHE_PRIVATE_KEY_1 || "";
const GANACHE_PRIVATE_KEY_2 = process.env.GANACHE_PRIVATE_KEY_2 || ""; // Add more if needed
const GANACHE_RPC_URL = process.env.RPC_URL || "http://127.0.0.1:7545"; // Default Ganache UI port

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28", // Or your contract's version
  networks: {
    // --- Hardhat's built-in network ---
    hardhat: {
      // Configuration for the default in-memory network
    },
    // --- Ganache Network Configuration ---
    ganache: {
      url: GANACHE_RPC_URL,
      // Add accounts derived from the private keys Ganache provides
      // IMPORTANT: Make sure these match the keys shown in your running Ganache instance
      accounts: [
          ...(GANACHE_PRIVATE_KEY_1 ? [GANACHE_PRIVATE_KEY_1] : []),
          ...(GANACHE_PRIVATE_KEY_2 ? [GANACHE_PRIVATE_KEY_2] : []),
          // Add more keys from Ganache as needed
        ].filter(key => key !== "") // Filter out empty keys if not set in .env
    },
    // --- Other networks like Sepolia, Mainnet etc. ---
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL || "",
    //   accounts: [process.env.YOUR_DEPLOYER_PRIVATE_KEY || ""]
    // }
  },
  // Optional: Specify default network if you primarily use Ganache
  // defaultNetwork: "ganache",
};
