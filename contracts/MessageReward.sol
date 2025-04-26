// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MessageReward{
    using ECDSA for bytes32;

    address public baseStationAddress;
    address public iotDeviceAddress; // Assuming one IoT device for simplicity, or a registry pattern if more
    uint256 public fixedRewardAmount; // Reward amount in Wei

    // Tracks claimed message hashes to prevent replay attacks
    mapping(bytes32 => bool) public claimedHashes;

    event RewardClaimed(bytes32 indexed messageHash, address indexed intermediary, address indexed signer);
    event ConfigUpdated(address baseStation, address iotDevice, uint256 rewardAmount);

    // --- Constructor & Configuration ---

    constructor(address _initialBaseStation, address _initialIotDevice, uint256 _initialRewardWei) {
        require(_initialBaseStation != address(0), "Invalid Base Station address");
        require(_initialIotDevice != address(0), "Invalid IoT Device address");
        baseStationAddress = _initialBaseStation;
        iotDeviceAddress = _initialIotDevice;
        fixedRewardAmount = _initialRewardWei;
        emit ConfigUpdated(_initialBaseStation, _initialIotDevice, _initialRewardWei);
    }

    // Allow updating addresses/reward (simple, no ownership check for prototyping)
    function updateConfig(address _newBaseStation, address _newIotDevice, uint256 _newRewardWei) external {
         require(_newBaseStation != address(0), "Invalid Base Station address");
         require(_newIotDevice != address(0), "Invalid IoT Device address");
         baseStationAddress = _newBaseStation;
         iotDeviceAddress = _newIotDevice;
         fixedRewardAmount = _newRewardWei;
         emit ConfigUpdated(_newBaseStation, _newIotDevice, _newRewardWei);
    }

    // --- Core Logic ---

    /**
     * @notice Intermediary calls this AFTER successful delivery to claim reward.
     * @param _messageHash The keccak256 hash of the original plaintext message/command.
     * @param _signature The signature (from Base Station OR IoT Device) over the ETH-prefixed message hash.
     */
    function claimReward(bytes32 _messageHash, bytes memory _signature) external {
        require(fixedRewardAmount > 0, "Reward amount not set");
        require(!claimedHashes[_messageHash], "Reward already claimed for this hash");

        // Verify the signature against the hash
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
        address recoveredSigner = ECDSA.recover(prefixedHash, _signature);

        require(recoveredSigner != address(0), "Invalid signature");

        // Check if the signer is one of the authorized parties
        require(recoveredSigner == baseStationAddress || recoveredSigner == iotDeviceAddress, "Signer not authorized");

        // Mark as claimed BEFORE transfer to prevent re-entrancy style issues
        claimedHashes[_messageHash] = true;

        // Transfer fixed reward to the intermediary (msg.sender)
        (bool success, ) = payable(msg.sender).call{value: fixedRewardAmount}("");
        require(success, "ETH transfer failed");

        emit RewardClaimed(_messageHash, msg.sender, recoveredSigner);
    }

    // --- Helper ---
    // Allow contract owner (deployer) to withdraw accidental ETH sends (optional but good practice)
    // For prototyping, we can skip complex ownership patterns
    // function withdrawEth(address payable _to) external { // Add access control if needed
    //     (bool success, ) = _to.call{value: address(this).balance}("");
    //     require(success, "Withdraw failed");
    // }

    // Receive ETH (needed for reward funding if not sent with claimReward - though here reward is internal)
    receive() external payable {}
}
