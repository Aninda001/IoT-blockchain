import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import pkg from 'hardhat';
const { ethers } = pkg;

// Define parameters for the module
// These names ('baseStationAddress', etc.) will be used when calling the deployment
const SimpleRewardModule = buildModule("SimpleRewardModule", (m) => {
  // Get parameters passed during deployment execution
  const baseStationAddress = m.getParameter("baseStationAddress");
  const iotDeviceAddress = m.getParameter("iotDeviceAddress");
  const initialRewardWei = m.getParameter("initialRewardWei");

  // Deploy the contract using the parameters
  const messageRewardSimple = m.contract("MessageReward", [
    baseStationAddress,
    iotDeviceAddress,
    initialRewardWei,
  ]);

  // Return the deployed contract instance (optional, but good practice)
  return { messageRewardSimple };
});

export default SimpleRewardModule;
