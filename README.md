# Hybrid Encryption Protocol for IoT-to-Base Communication


A secure communication protocol implementation for IoT devices, combining the strengths of asymmetric and symmetric cryptography to provide robust end-to-end encryption with forward secrecy, mutual authentication, and data integrity.

**Project Information:**
- **Last Updated:** 2025-04-07 05:11:40 UTC
- **Maintainer:** [Aninda001](https://github.com/Aninda001)

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
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Running the Emulator](#running-the-emulator)
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

![Uplink (IoT → Base)](./diagrams/Uplink (IoT → Base)2.drawio.svg)

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

![Downlink (Base → IoT)](./diagrams/Downlink (Base → IoT).drawio.svg)

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

![Data Flow](./diagrams/Data Flow.drawio.svg)

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

### Prerequisites

- Node.js 18.x or later
- npm 7.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Aninda001/IoT-blockchain.git
cd IoT-blockchain
```

2. Install dependencies:
```bash
npm install
```

### Running the Emulator

You can run all components concurrently or each component separately:

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

Once all components are running, you can:

1. Select option `1` in either IoT or Base Station terminal to send a message
2. Enter your message when prompted
3. Select option `2` in the receiving terminal to view received messages

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

