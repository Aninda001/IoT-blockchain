import pkg from 'hardhat';
const { ignition, ethers } = pkg; // ethers is required for parseEther

import "dotenv/config"; // Ensure .env is loaded

// Import the module definition
import SimpleRewardModule from "./modules/deploy.js";
async function main() {
  console.log("Starting Ignition deployment...");

  // --- Load Parameters from .env ---
  const baseStationAddress = process.env.BASE_STATION_ETH_ADDRESS;
  const iotDeviceAddress = process.env.IOT_DEVICE_ETH_ADDRESS;
  const initialRewardEth = process.env.INITIAL_REWARD_ETH || "0.01"; // Default if not in .env 
  // --- Required for Funding ---
  const baseStationPrivateKey = process.env.BASE_STATION_ETH_PRIVATE_KEY;
  const initialContractFundingEth = process.env.INITIAL_CONTRACT_FUNDING_ETH || "10"; // e.g., "0.1"
  // --- ---

  // Basic validation
  if (!baseStationAddress || baseStationAddress.startsWith('YOUR_') ||
      !iotDeviceAddress || iotDeviceAddress.startsWith('YOUR_')) {
    console.error("!!! Error: BASE_STATION_ETH_ADDRESS or IOT_DEVICE_ETH_ADDRESS not set correctly in .env file.");
    process.exit(1);
  }

  const initialRewardWei = ethers.parseEther(initialRewardEth);

  console.log("Deployment Parameters:");
  console.log(`  Base Station Address: ${baseStationAddress}`);
  console.log(`  IoT Device Address:   ${iotDeviceAddress}`);
  console.log(`  Initial Reward (Wei): ${initialRewardWei.toString()}`);

  // Deploy the module, passing the parameters
  // Hardhat automatically uses the network specified via --network flag
  const { messageRewardSimple } = await ignition.deploy(SimpleRewardModule, {
    parameters: {
      SimpleRewardModule: { // Module name must match
        baseStationAddress: baseStationAddress,
        iotDeviceAddress: iotDeviceAddress,
        initialRewardWei: initialRewardWei,
      }
    },
    // Optional: Specify gas price, nonce etc. if needed
  });

  const contractAddress = await messageRewardSimple.getAddress();
  console.log(`\n🚀 MessageRewardSimple contract deployed successfully!`);
  console.log(`   Address: ${contractAddress}`);
  console.log(`\nPlease update MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS in your .env file or config.js`);

  // You might want to automatically update a config file here if needed
  // e.g., updateConfigFile('MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS', contractAddress); 
  const deployedRewardWei = await messageRewardSimple.fixedRewardAmount();
  console.log(`   Deployed Reward Amount: ${ethers.formatEther(deployedRewardWei)} ETH (${deployedRewardWei.toString()} Wei)`);


  // --- 2. Fund the Contract from Base Station ---
  console.log("\n💰 Attempting automatic funding from Base Station...");

  // --- Funding Safety Checks ---
  if (!initialContractFundingEth || parseFloat(initialContractFundingEth) <= 0) {
      console.warn("⚠️ Skipping funding: INITIAL_CONTRACT_FUNDING_ETH not set or is zero in .env file.");
      console.log("\n🎉 Deployment complete (without funding).");
      console.log(`   Remember to manually fund the contract at ${contractAddress} if needed.`);
      return; // Exit script successfully if no funding amount specified
  }
  if (!baseStationPrivateKey) {
      console.error("❌ ERROR: BASE_STATION_ETH_PRIVATE_KEY not found in .env. Cannot fund contract.");
      console.error("   Deployment succeeded, but funding failed. Please fund manually.");
      process.exit(1); // Exit with error code
  }
  // --- ---

  const fundingAmountWei = ethers.parseEther(initialContractFundingEth);

  // --- Funding Transaction Logic ---
  try {
      // Get the provider (needed for wallet connection and balance checks)
      // 'hre.ethers.provider' is usually available in Hardhat scripts,
      // but let's explicitly get it from the config if needed.
      const provider = ethers.provider; // Hardhat injects ethers with provider

      // Create Wallet instance for Base Station
      const baseStationWallet = new ethers.Wallet(baseStationPrivateKey, provider);
      const actualBaseStationAddress = baseStationWallet.address; // Get address directly from key

      console.log(`   Funding Contract:  ${contractAddress}`);
      console.log(`   From Base Station: ${actualBaseStationAddress}`);
      console.log(`   Amount:            ${initialContractFundingEth} ETH (${fundingAmountWei.toString()} Wei)`);

      // Check Base Station balance BEFORE sending
      const bsBalanceWei = await provider.getBalance(actualBaseStationAddress);
      console.log(`   Base Station Balance: ${ethers.formatEther(bsBalanceWei)} ETH`);

      if (bsBalanceWei < fundingAmountWei) {
          console.error(`❌ ERROR: Base Station account ${actualBaseStationAddress} has insufficient funds (${ethers.formatEther(bsBalanceWei)} ETH) to send ${initialContractFundingEth} ETH.`);
          console.error("   Deployment succeeded, but funding failed. Please fund manually.");
          process.exit(1); // Exit with error code
      }

      // Send the funding transaction
      console.log("   Sending funding transaction...");
      const tx = await baseStationWallet.sendTransaction({
          to: contractAddress,       // Send ETH to the contract's address
          value: fundingAmountWei,   // The amount to send
          // gasLimit: 50000 // Optionally set gas limit if needed
      });

      console.log(`   Transaction sent, Hash: ${tx.hash}`);
      console.log("   Waiting for confirmation (1 block)...");
      await tx.wait(1); // Wait for 1 confirmation
      console.log("   ✅ Funding transaction confirmed.");

      // Verify contract balance AFTER funding
      const contractBalanceWei = await provider.getBalance(contractAddress);
      console.log(`   ✅ Contract ${contractAddress} new balance: ${ethers.formatEther(contractBalanceWei)} ETH`);
      console.log("\n🎉 Deployment and funding complete!");
      console.log(`   Please update MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS in your .env or config.js to: ${contractAddress}`);


  } catch (error) {
      console.error("\n--- ❌ ERROR DURING CONTRACT FUNDING ---");
      console.error(`   Failed to send ${initialContractFundingEth} ETH from Base Station to ${contractAddress}`);
      console.error("   Error details:", error.message || error);
      console.error("   Deployment succeeded, but funding failed. Please ensure BASE_STATION_ETH_PRIVATE_KEY is correct and has funds, then fund manually.");
      process.exit(1); // Exit with error code
  }
  // --- End Funding Transaction Logic ---
}


main().catch((error) => {
  console.error("Ignition deployment failed:", error);
  process.exitCode = 1;
});
