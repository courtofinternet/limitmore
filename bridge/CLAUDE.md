# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

One-way cross-chain messaging bridge from GenLayer to EVM chains (Base) using LayerZero V2. zkSync serves as the hub chain.

## Architecture

```
GenLayer → EVM:
  GenLayer BridgeSender.py → Service polls → zkSync BridgeForwarder → LayerZero → Target EVM
```

## Directory Structure

- `/smart-contracts` - Solidity contracts for EVM chains (Hardhat)
- `/intelligent-contracts` - Python contracts for GenLayer
- `/service` - Node.js relay service that polls and relays messages

## Key Contracts

| Contract              | Chain    | Purpose                               |
| --------------------- | -------- | ------------------------------------- |
| `BridgeSender.py`     | GenLayer | Stores outbound GL→EVM messages       |
| `BridgeForwarder.sol` | zkSync   | Relays GL→EVM via LayerZero           |

## Commands

### Smart Contracts

```bash
cd smart-contracts

# Compile
npx hardhat compile

# Run tests
npx hardhat test

# Deploy BridgeForwarder
npx hardhat run scripts/deploy.ts --network zkSyncSepoliaTestnet

# Configure destination bridge
DST_EID=40245 DST_BRIDGE_ADDRESS=0x... BRIDGE_FORWARDER_ADDRESS=0x... \
  npx hardhat run scripts/configure.ts --network zkSyncSepoliaTestnet
```

### Bridge Service

```bash
cd service

npm run build    # Compile TypeScript
npm start        # Run service

# Debug CLI
npx ts-node cli.ts check-forwarder   # Check zkSync BridgeForwarder state
npx ts-node cli.ts check-config      # Verify configuration
npx ts-node cli.ts debug-tx <hash>   # Debug a transaction
```

## Key Design Patterns

1. **Stored Message Polling** - Service polls stored messages from GenLayer instead of events for reliability
2. **Authorized Callers** - Bridge service wallet must be authorized as CALLER_ROLE on BridgeForwarder
3. **Replay Prevention** - `usedTxHash` mapping in BridgeForwarder prevents duplicate relays

## LayerZero Endpoint IDs

```
zkSync Sepolia: 40305    Base Sepolia: 40245
zkSync Mainnet: 30165    Base Mainnet: 30184
```

## Environment Variables

### Service (`service/.env`)

```bash
# RPC URLs
FORWARDER_NETWORK_RPC_URL=https://sepolia.era.zksync.dev
GENLAYER_RPC_URL=https://studio-stage.genlayer.com/api

# Contracts
BRIDGE_FORWARDER_ADDRESS=0x...
BRIDGE_SENDER_ADDRESS=0x...  # GenLayer BridgeSender IC address

# Auth
PRIVATE_KEY=...

# Sync interval (cron format)
BRIDGE_SYNC_INTERVAL=*/5 * * * *
```

### Smart Contracts (`smart-contracts/.env`)

```bash
PRIVATE_KEY=...
OWNER_ADDRESS=0x...
CALLER_ADDRESS=0x...  # Service wallet address

# LayerZero endpoint
ZKSYNCSEPOLIATESTNET_ENDPOINT=0xe2Ef622A13e71D9Dd2BBd12cd4b27e1516FA8a09
```

## Message Flow

1. Source IC calls `BridgeSender.send_message(target_chain_eid, target_contract, data)`
2. Service polls `get_message_hashes()` and `get_message()` on GenLayer
3. Service calls `BridgeForwarder.callRemoteArbitrary()` on zkSync with LayerZero fee
4. LayerZero delivers to destination chain
5. Target contract receives via `processBridgeMessage()`

## Testing

```bash
cd smart-contracts
npx hardhat test
npx hardhat test test/BridgeForwarder.test.ts
```
