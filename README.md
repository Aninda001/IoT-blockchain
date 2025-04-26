# Hybrid Encryption Protocol for IoT-to-Base Communication


A secure communication protocol implementation for IoT devices, combining the strengths of asymmetric and symmetric cryptography to provide robust end-to-end encryption with forward secrecy, mutual authentication, and data integrity.

## Table of Contents

1. [Overview](#overview)
2. [Protocol Components](#protocol-components)
   - [Asymmetric Cryptography](#asymmetric-cryptography)
   - [Symmetric Cryptography](#symmetric-cryptography)
   - [Key Derivation Function](#key-derivation-function)
3. [Protocol Workflow](#protocol-workflow)
   - [Uplink (IoT → Base)](#uplink-iot--base)
   - [Downlink (Base → IoT)](#downlink-base--iot)
4. [Security Properties](#security-properties)
5. [Implementation](#implementation)
   - [Architecture](#architecture)
   - [Components](#components)
   - [Data Flow](#data-flow)
6. [Getting Started](#getting-started)
   1.  [Prerequisites](#i-prerequisites)
   2.  [Project Setup](#ii-project-setup)
   3.  [Configuration (.env file)](#iii-configuration-env-file)
   4.  [Setting up Ganache](#iv-setting-up-ganache)
   5.  [Compile Contracts](#v-compile-contracts)
   6.  [Deploy the Contract](#vi-deploy-the-contract)
   7.  [Verify Deployment](#vii-verify-deployment)
   8.  [Post-Deployment Configuration](#viii-post-deployment-configuration)
   9.  [Running the Off-Chain Scripts](#ix-running-the-off-chain-scripts)
   10. [Troubleshooting](#x-troubleshooting)
7. [API Reference](#api-reference)
8. [Security Considerations](#security-considerations)
9. [Performance Considerations](#performance-considerations)

## Overview

This project implements a hybrid encryption protocol designed specifically for IoT-to-Base station communication. By leveraging both asymmetric and symmetric cryptography, it addresses the unique security challenges faced in IoT environments:

- **Resource constraints**: Minimizes computational overhead on IoT devices
- **Security**: Provides strong encryption, authentication, and integrity
- **Flexibility**: Accommodates various IoT deployment scenarios
- **Scalability**: Supports multiple devices communicating with base stations

The protocol emulator demonstrates the complete workflow from key generation to secure message transmission through potentially untrusted intermediaries.

## Protocol Components

### Asymmetric Cryptography

The protocol uses Elliptic Curve Cryptography (ECC) for key exchange and digital signatures:

#### Elliptic Curve Diffie-Hellman (ECDH)

- **Purpose**: Securely establish a shared secret between IoT device and base station
- **Curve**: NIST P-256 (secp256r1) - provides 128-bit security level
- **Key Types**:
  - **Static Keys**: Long-term keys pre-shared between IoT and base station
    - IoT: `staticPrivateKey` (private), `staticPublicKey` (public)
    - Base: `staticPrivateKey` (private), `staticPublicKey` (public)
  - **Ephemeral Keys**: Per-session keys for forward secrecy
    - Generated fresh for each transmission
    - Discarded after use

#### Elliptic Curve Digital Signature Algorithm (ECDSA)

- **Purpose**: Authenticate messages, prevent tampering and spoofing
- **Keys**:
  - IoT: `SigPrivateKey` (private), `SigPublicKey` (public)
  - Base: `SigPrivateKey` (private), `SigPublicKey` (public)
- **Implementation**: Uses SHA-256 for message digests

### Symmetric Cryptography

Advanced Encryption Standard with Galois/Counter Mode (AES-GCM):

- **Purpose**: Fast and secure encryption of bulk data
- **Key Size**: 128-bit (AES-128-GCM)
- **Nonce Size**: 12 bytes (96 bits)
- **Authentication Tag**: 16 bytes (128 bits) for data integrity

### Key Derivation Function

HMAC-based Extract-and-Expand Key Derivation Function (HKDF):

- **Purpose**: Derive cryptographically strong keys from the ECDH shared secret
- **Hash Function**: SHA-256
- **Inputs**:
  - `sharedSecret`: Output from ECDH key agreement
  - `salt`: Context-specific value (e.g., "uplink_salt")
  - `info`: Additional context information (e.g., "uplink_key_derivation")
- **Outputs**: 32 bytes of key material
  - First 16 bytes: AES-128 key
  - Next 12 bytes: Nonce
  - Last 4 bytes: Reserved/padding

## Protocol Workflow

### Uplink (IoT → Base)

![Uplink (IoT → Base)](./diagrams/Uplink%20(IoT%20→%20Base)2.drawio.svg)

1. **IoT Device Side**:
   - Generate ephemeral ECDH key pair (`ephemeralPrivateKey`, `ephemeralPublicKey`)
   - Compute shared secret using `ECDH(ephemeralPrivateKey, staticPublicKeyBase)`
   - Derive AES key and nonce using HKDF
   - Encrypt the message with AES-GCM
   - Sign the ciphertext+tag with ECDSA using `SigPrivateKeyIoT`
   - Transmit: `ephemeralPublicKey`, `ciphertext`, `tag`, and `signature`

2. **Intermediary**:
   - Relays the encrypted payload without modification
   - Cannot access plaintext (has no access to required private keys)

3. **Base Station Side**:
   - Verify signature using `SigPublicKeyIoT`
   - Compute shared secret using `ECDH(staticPrivateKeyBase, ephemeralPublicKeyIoT)`
   - Derive AES key and nonce using HKDF (same parameters)
   - Decrypt the message using AES-GCM

```javascript
// IoT Device (Simplified)
const { privateKey: ephemeralPrivateKey, publicKey: ephemeralPublicKey } = await EC_key_pair();
const sharedSecret = await deriveSharedSecret(ephemeralPrivateKey, staticPublicKeyBase);
const { aesKey, nonce } = deriveAESKeyAndNonce(sharedSecret, salt, info);
const { ciphertext, tag } = aesGcmEncrypt(aesKey, nonce, message);
const signature = signData(SigPrivateKeyIoT, Buffer.concat([ciphertext, tag]));
```

### Downlink (Base → IoT)

![Downlink (Base → IoT)](./diagrams/Downlink%20(Base%20→%20IoT).drawio.svg)

1. **Base Station Side**:
   - Generate ephemeral ECDH key pair (`ephemeralPrivateKey`, `ephemeralPublicKey`)
   - Compute shared secret using `ECDH(ephemeralPrivateKey, staticPublicKeyIoT)`
   - Derive AES key and nonce using HKDF
   - Encrypt the message with AES-GCM
   - Sign the ciphertext+tag with ECDSA using `SigPrivateKeyBase`
   - Transmit: `ephemeralPublicKey`, `ciphertext`, `tag`, and `signature`

2. **Intermediary**:
   - Relays the encrypted payload without modification
   - Cannot access plaintext (has no access to required private keys)

3. **IoT Device Side**:
   - Verify signature using `SigPublicKeyBase`
   - Compute shared secret using `ECDH(staticPrivateKeyIoT, ephemeralPublicKeyBase)`
   - Derive AES key and nonce using HKDF (same parameters)
   - Decrypt the message using AES-GCM

```javascript
// Base Station (Simplified)
const { privateKey: ephemeralPrivateKey, publicKey: ephemeralPublicKey } = await EC_key_pair();
const sharedSecret = await deriveSharedSecret(ephemeralPrivateKey, staticPublicKeyIoT);
const { aesKey, nonce } = deriveAESKeyAndNonce(sharedSecret, salt, info);
const { ciphertext, tag } = aesGcmEncrypt(aesKey, nonce, message);
const signature = signData(SigPrivateKeyBase, Buffer.concat([ciphertext, tag]));
```

## Security Properties

The hybrid protocol provides the following security properties:

| Property | Description |
|----------|-------------|
| **End-to-End Encryption** | Only authorized endpoints can access plaintext data |
| **Forward Secrecy** | Compromise of long-term keys doesn't compromise past sessions |
| **Mutual Authentication** | Both parties verify each other's identity |
| **Data Integrity** | Tampering with messages is detected |
| **Replay Protection** | Each session uses unique ephemeral keys |

## Implementation

This repository contains a Node.js-based emulator demonstrating the complete protocol. The implementation consists of three main components: IoT device, intermediary, and base station.

### Architecture

![Architecture](./diagrams/Architecture.drawio.svg)

The emulator uses a three-node architecture:
- **IoT Device**: Simulated on port 9999
- **Intermediary**: Runs on port 10000, relays messages between IoT and base
- **Base Station**: Simulated on port 10001

### Components

| Component | File | Description |
|-----------|------|-------------|
| **IoT Device** | `iot-device.js` | Simulates an IoT device with encryption/decryption capabilities |
| **Base Station** | `base-station.js` | Simulates a base station with encryption/decryption capabilities |
| **Intermediary** | `intermediary.js` | Relays encrypted messages between IoT and base station |
| **Crypto Utilities** | `crypto_utils.js` | Implements cryptographic operations (ECDH, AES-GCM, ECDSA, HKDF) |
| **Configuration** | `config.js` | Stores and manages public keys for the system |

### Data Flow

![Data Flow](./diagrams/Data%20Flow.drawio.svg)

The protocol implementation follows the standard sequence:

1. **Key Generation**:
   - Each party generates its static ECDH and ECDSA key pairs
   - Public keys are shared via the configuration module

2. **Message Preparation**:
   - Sender generates ephemeral key pair
   - Derives shared secret using ECDH
   - Derives encryption key and nonce
   - Encrypts message with AES-GCM
   - Signs encrypted payload

3. **Message Transmission**:
   - Encrypted payload passes through intermediary
   - Intermediary cannot read or modify the content

4. **Message Reception**:
   - Receiver verifies signature
   - Computes same shared secret
   - Derives same encryption key and nonce
   - Decrypts message

## Getting Started

### i. Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js:** (v18 or later recommended) - Download from [nodejs.org](https://nodejs.org/)
*   **npm:** Usually included with Node.js.
*   **Git:** For cloning the repository - Download from [git-scm.com](https://git-scm.com/)
*   **Ganache:** A personal blockchain for Ethereum development. Download the UI version from [Truffle Suite Ganache](https://trufflesuite.com/ganache/) or use Ganache CLI. This guide assumes the UI version.

### ii. Project Setup

1.  **Clone the Repository:**
    Open your terminal or command prompt and clone the project:
    ```bash
    git clone https://github.com/Aninda001/IoT-blockchain.git
    cd IoT-blockchain
    ```

2.  **Install Dependencies:**
    Install the necessary Node.js packages defined in `package.json`:
    ```bash
    npm install
    ```

### iii. Configuration (.env file)

Configuration parameters, especially sensitive ones like private keys, are managed using a `.env` file.

1.  **Create `.env` file:**
    Make a copy of the example environment file:
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env` file:**
    Open the newly created `.env` file in a text editor and fill in the values. **These are crucial for deployment and operation.**

    ```dotenv
    # --- Ganache Network Details ---
    # Obtain this from your running Ganache instance (usually top right in UI)
    # Default for Quickstart is http://127.0.0.1:7545
    RPC_URL=http://127.0.0.1:7545

    # --- Account Private Keys (Obtain from Ganache Accounts tab) ---
    # IMPORTANT: Ensure these accounts exist in your Ganache workspace!
    # Private key for the account acting as the Base Station
    BASE_STATION_ETH_PRIVATE_KEY=YOUR_BASE_STATION_ACCOUNT_PRIVATE_KEY_HERE
    # Private key for the account acting as the IoT Device
    IOT_DEVICE_ETH_PRIVATE_KEY=YOUR_IOT_DEVICE_ACCOUNT_PRIVATE_KEY_HERE
    # Private key for the account acting as the Intermediary
    INTERMEDIARY_ETH_PRIVATE_KEY=YOUR_INTERMEDIARY_ACCOUNT_PRIVATE_KEY_HERE

    # --- Account Addresses (Corresponding to the private keys above) ---
    # Public address for the Base Station account (copy from Ganache)
    BASE_STATION_ETH_ADDRESS=YOUR_BASE_STATION_ACCOUNT_ADDRESS_HERE
    # Public address for the IoT Device account (copy from Ganache)
    IOT_DEVICE_ETH_ADDRESS=YOUR_IOT_DEVICE_ACCOUNT_ADDRESS_HERE

    # --- Contract Configuration ---
    # The reward amount paid per successful claim, specified in ETH (e.g., "0.001")
    INITIAL_REWARD_ETH=0.001

    # --- Contract Funding Configuration ---
    # How much ETH the Base Station account should send to the contract upon deployment
    # Must be enough for multiple rewards (e.g., "0.1" for 100 rewards of 0.001 ETH)
    # IMPORTANT: The Base Station account MUST have at least this much ETH + gas fees.
    INITIAL_CONTRACT_FUNDING_ETH=0.1

    # --- Deployed Contract Address (Fill this AFTER deployment) ---
    # The address of the MessageRewardSimple contract after successful deployment
    MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS=
    ```

    *   **Private Keys:** Go to the "ACCOUNTS" tab in Ganache. Each account shows its address and a key icon. Click the key icon to reveal and copy the private key. **Never commit `.env` files containing real private keys to public repositories.**
    *   **Addresses:** Copy the public addresses directly visible in the Ganache "ACCOUNTS" tab. Ensure the address matches the private key you copied.
    *   **Funding:** Ensure the account specified by `BASE_STATION_ETH_PRIVATE_KEY` has sufficient ETH balance in Ganache (Quickstart usually gives 100 ETH per account) to cover the `INITIAL_CONTRACT_FUNDING_ETH` plus gas costs.

### iv. Setting up Ganache

1.  **Launch Ganache UI.**
2.  **Use Quickstart:**
    *   Click the large **"QUICKSTART (ETHEREUM)"** button on the main Ganache screen.
    *   This instantly starts a local Ethereum blockchain with pre-funded accounts.
    *   The default RPC server address is usually `http://127.0.0.1:7545`. Ensure this matches `RPC_URL` in your `.env` file.
3.  **Identify Accounts:** Go to the "ACCOUNTS" tab. Note the addresses and copy the private keys for the accounts you intend to use as the Base Station, IoT Device, and Intermediary. Update your `.env` file accordingly (see step 3.2).
4.  **Keep Ganache Running:** The deployment script needs to connect to this running Ganache instance.

### v. Compile Contracts

Before deploying, compile the Solidity smart contracts using Hardhat:

```bash
npx hardhat compile
```

This command reads your contracts (e.g., `contracts/MessageReward.sol`), checks for syntax errors, and generates artifacts (ABI, bytecode) in the `artifacts/` directory. If you encounter errors, check the Solidity version (`pragma solidity ...`) specified in the contract against the version configured in `hardhat.config.js`.

### vi. Deploy the Contract

This project uses Hardhat Ignition with a deployment script that handles both deploying the contract and automatically funding it from the Base Station account.

1.  **Ensure `.env` is Correct:** Double-check all values in your `.env` file, especially private keys, addresses, and the funding amount. Ensure the Base Station account has enough ETH in Ganache.
2.  **Run the Deployment Script:**
    Execute the main deployment script, specifying the `ganache` network defined in your `hardhat.config.js`:
    ```bash
    npx hardhat run ignition/deploy.js --network ganache
    ```

3.  **Monitor Output:** Watch the terminal output carefully. You should see:
    *   Logs indicating the start of the deployment.
    *   The parameters being used (Base Station address, IoT address, reward amount).
    *   Confirmation that the `MessageRewardSimple` contract deployment transaction was sent and confirmed.
    *   The **deployed contract address** printed to the console. **COPY THIS ADDRESS!**
    *   Logs indicating the start of the automatic funding process.
    *   Details of the funding transaction (from Base Station address, amount).
    *   Confirmation that the funding transaction was sent and confirmed.
    *   The final ETH balance of the deployed contract.
    *   A success message if both deployment and funding completed.

### vii. Verify Deployment

After the script finishes (hopefully successfully), verify the deployment:

1.  **Check Script Output:** Confirm the script reported successful deployment and funding, and note the final contract balance.
2.  **Use Hardhat Console:** Connect to the Ganache network via the Hardhat console for direct interaction:
    ```bash
    npx hardhat console --network ganache
    ```
    Inside the console (`>` prompt), run these commands (replace `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` with the actual address from the script output):

    ```javascript
    // Get the contract factory
    const MessageRewardFactory = await ethers.getContractFactory("MessageRewardSimple"); // Use exact contract name

    // Attach to the deployed instance
    const contractAddress = "<YOUR_DEPLOYED_CONTRACT_ADDRESS>";
    const rewardContract = MessageRewardFactory.attach(contractAddress);

    // --- Check Contract State ---
    // Check configured reward amount (should match INITIAL_REWARD_ETH in Wei)
    (await rewardContract.fixedRewardAmount()).toString();

    // Check configured Base Station address
    await rewardContract.baseStationAddress();

    // Check configured IoT Device address
    await rewardContract.iotDeviceAddress();

    // *** Check Contract ETH Balance (MOST IMPORTANT verification after funding) ***
    // Should match the final balance reported by the deployment script
    (await ethers.provider.getBalance(contractAddress)).toString();

    // Exit console: Ctrl+C twice or type .exit
    ```

### viii. Post-Deployment Configuration

1.  **Update `.env`:** Open your `.env` file again.
2.  **Paste Contract Address:** Find the line `MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS=` and paste the actual contract address you copied from the deployment script output.
3.  **Save `.env`**. The off-chain scripts (`intermediary.js`, etc.) will need this address to interact with the correct contract instance.

### ix. Running the Off-Chain Scripts

With the contract deployed, funded, and configured in `.env`, you can now run the Node.js scripts that interact with it (Base Station, IoT Device, Intermediary):

**Run all components:**
```bash
npm run start-all
```

**Run individual components:**
```bash
# Terminal 1 - IoT Device
npm run start-iot

# Terminal 2 - Intermediary
npm run start-intermediary

# Terminal 3 - Base Station
npm run start-base
```
Ensure these scripts correctly load the `MESSAGE_REWARD_SIMPLE_CONTRACT_ADDRESS` from your configuration.
Once all components are running, you can:

1. Select option `1` in either IoT or Base Station terminal to send a message
2. Enter your message when prompted
3. Select option `2` in the receiving terminal to view received messages

### x. Troubleshooting

*   **`Insufficient funds` Error During Deployment:** The *deployer account* (likely the first Ganache account if not specified otherwise in `hardhat.config.js`) doesn't have enough ETH for deployment gas. Quickstart usually provides enough (100 ETH), but if you changed deployers or ran many transactions, check the balance.
*   **`Insufficient funds` Error During Funding Step:** The *Base Station account* (specified by `BASE_STATION_ETH_PRIVATE_KEY`) doesn't have enough ETH to send the `INITIAL_CONTRACT_FUNDING_ETH` plus gas. Check its balance in Ganache.
*   **`BASE_STATION_ETH_PRIVATE_KEY not found` Error:** The `BASE_STATION_ETH_PRIVATE_KEY` variable is missing or commented out in your `.env` file.
*   **Funding Fails / Contract Balance is 0:**
    *   Check the Base Station private key and address are correct in `.env`.
    *   Verify the Base Station account has enough ETH in Ganache.
    *   Ensure `INITIAL_CONTRACT_FUNDING_ETH` in `.env` is greater than 0.
    *   Check the deployment script logs for specific errors during the funding transaction.
*   **`CALL_EXCEPTION` or Revert Errors when interacting:**
    *   Ensure the contract has sufficient ETH balance (`ethers.provider.getBalance(contractAddress)` in console). Fund it if needed.
    *   Verify the signatures being used are correct and generated by the appropriate private key (Base Station or IoT Device).
    *   Check if the hash being claimed has already been claimed (`rewardContract.claimedHashes(hashToCheck)` in console).
    *   Ensure the addresses configured in the contract match the addresses generating signatures.
*   **Compilation Errors:** Check `pragma` versions, contract syntax, or run `npx hardhat clean` and `npm install` again.
*   **Network Connection Errors:** Ensure Ganache is running and the `GANACHE_RPC_URL` in `.env` matches Ganache's RPC server address (usually `http://127.0.0.1:7545` for Quickstart).

## API Reference

### Crypto Utilities API

```javascript
// Generate EC key pair (returns PEM-formatted keys)
const { publicKey, privateKey } = await EC_key_pair();

// Derive shared secret from private key and public key
const sharedSecret = await deriveSharedSecret(privateKeyPem, publicKeyPem);

// Derive AES key and nonce from shared secret
const { aesKey, nonce } = deriveAESKeyAndNonce(sharedSecret, salt, info);

// Encrypt data with AES-GCM
const { ciphertext, tag } = aesGcmEncrypt(aesKey, nonce, plaintext);

// Decrypt data with AES-GCM
const plaintext = aesGcmDecrypt(aesKey, nonce, ciphertext, tag);

// Sign data with ECDSA
const signature = signData(privateKeyPem, dataToSign);

// Verify signature with ECDSA
const isValid = verifySignature(publicKeyPem, dataToVerify, signature);
```

### HTTP Endpoints

**Intermediary (Port 10000)**:
- `POST /base`: Forward messages from IoT device to base station
- `POST /iot`: Forward messages from base station to IoT device

**IoT Device (Port 9999)**:
- `POST /msg`: Receive encrypted messages from base station

**Base Station (Port 10001)**:
- `POST /msg`: Receive encrypted messages from IoT device

## Security Considerations

### Key Management

- **Private Keys**: In a production environment, private keys should be stored securely:
  - Use Hardware Security Modules (HSMs) or Trusted Platform Modules (TPMs)
  - For IoT devices, use secure elements or trusted execution environments
  - Never expose private keys in logs or debugging output

- **Key Rotation**: Implement regular key rotation for long-term keys:
  - Use a secure out-of-band mechanism for distributing new keys
  - Maintain backward compatibility during transition periods

### Implementation Hardening

- **Side-Channel Attacks**: The current implementation doesn't include protection against timing or power analysis attacks
- **Memory Management**: Sensitive data should be cleared from memory after use
- **Error Handling**: Implement constant-time error handling to prevent timing attacks

## Performance Considerations

The current implementation prioritizes clarity over performance. In real-world deployments, consider:

1. **Caching**: Cache derived keys for repeated communications with the same party
2. **Hardware Acceleration**: Use crypto acceleration if available
3. **Optimized Libraries**: Replace Node.js crypto with optimized libraries for constrained devices
4. **Message Size**: Optimize payload size for bandwidth-constrained networks:
   - Current overhead: ~112 bytes per message (32B ephemeral public key + 16B tag + 64B signature)

## Why Hybrid Encryption?

| **Aspect**               | **Asymmetric (ECDH/ECDSA)**        | **Symmetric (AES-GCM)**           |
|--------------------------|-----------------------------------|-----------------------------------|
| **Purpose**              | Key exchange, authentication      | Bulk data encryption              |
| **Speed**                | Slow (resource-intensive)         | Fast (optimized for IoT)          |
| **Key Management**       | Requires pre-shared public keys   | No key distribution (derived)     |
| **Security Level**       | 128-bit with P-256 curve          | 128-bit with AES-128              |
| **Message Size**         | Large overhead                    | Minimal overhead                  |

By combining both approaches, we get:
- Secure key exchange from asymmetric cryptography
- Performance benefits of symmetric encryption
- Strong authentication through digital signatures
- Perfect forward secrecy with ephemeral keys

## Key Lifecycle & Rotation

### Ephemeral Keys (Per Session)
- **Generated**: Fresh for every message/session
- **Lifetime**: Discarded immediately after use
- **Rotation Trigger**: Every transmission

### Static Keys (Long-Term)
- **ECDH Static Keys**:
  - **Rotation**: Manual (e.g., annually, or if compromised)
  - **Process**:
    1. Generate new key pairs
    2. Distribute new public keys securely
    3. Revoke old keys

- **ECDSA Signature Keys**:
  - **Rotation**: Same as ECDH static keys

## Challenges & Solutions

| **Challenge**                | **Solution**                                  |
|------------------------------|-----------------------------------------------|
| **Ephemeral Key Generation** | Use deterministic ECDH to reduce CPU load     |
| **Nonce Reuse**              | Derive nonce via HKDF (guarantees uniqueness) |
| **Key Distribution**         | Use secure boot process for static keys       |
| **Intermediary Trust**       | End-to-end encryption protects against MitM   |

