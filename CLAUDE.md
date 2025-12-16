# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Limitmore Exchange is a prediction market platform with three components:
- **`/contracts`** - Solidity betting contracts (Base Sepolia/Mainnet)
- **`/frontend`** - Next.js 15 web application
- **`/bridge`** - GenLayer ↔ EVM cross-chain relay service

## Commands

### Contracts (`/contracts`)
```bash
npm run compile          # Compile contracts + sync artifacts to frontend
npm run test             # Run Hardhat tests
npm run deploy:sepolia   # Deploy to Base Sepolia
npm run deploy:factory:sepolia  # Deploy BetFactoryCOFI to Base Sepolia
```

### Frontend (`/frontend`)
```bash
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Bridge Service (`/bridge/service`)
```bash
npm run build    # Compile TypeScript
npm run start    # Run relay service
npm run dev      # Development mode with ts-node
npm run test:e2e # End-to-end bridge test
```

## Architecture

```
User → Frontend (Next.js + Wagmi + Privy)
         ↓
    BetFactoryCOFI (Base) ──creates──→ BetCOFI instances
         ↓
    ResolutionRequested event
         ↓
    Bridge Service (EVM→GenLayer relay)
         ↓
    GenLayer Oracle (Python) ──fetches external data──→ determines winner
         ↓
    Bridge Service (GenLayer→EVM relay via LayerZero)
         ↓
    BetFactoryCOFI.processBridgeMessage() → BetCOFI.setResolution()
```

### Key Contracts
- **BetFactoryCOFI.sol** - Factory that creates bets, routes oracle resolutions, manages creator approvals
- **BetCOFI.sol** - Individual prediction market (USDC bets on Side A vs B, status: ACTIVE→RESOLVING→RESOLVED/UNDETERMINED)

### Bridge Flow
- EVM→GenLayer: Listens for `ResolutionRequested` events, deploys oracle contracts
- GenLayer→EVM: Polls for bridge messages, relays via zkSync+LayerZero to Base

### Resolution Types
- `CRYPTO` (0) - Crypto price predictions
- `STOCKS` (1) - Stock price predictions
- `NEWS` (2) - News-based outcomes

## Key Files

| Purpose | Path |
|---------|------|
| Factory contract | `/contracts/contracts/BetFactoryCOFI.sol` |
| Bet contract | `/contracts/contracts/BetCOFI.sol` |
| Contract tests | `/contracts/test/*.test.ts` |
| Bridge relay entry | `/bridge/service/src/index.ts` |
| EVM→GL relay | `/bridge/service/src/relay/EvmToGenLayer.ts` |
| GL→EVM relay | `/bridge/service/src/relay/GenLayerToEvm.ts` |
| Oracle contracts | `/bridge/service/intelligent-oracles/*.py` |
| Frontend onchain layer | `/frontend/src/lib/onchain/` |

## Environment Variables

Each component has a `.env.example` showing required variables. Key ones:
- `PRIVATE_KEY` - Transaction signer (contracts, bridge)
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC
- `BET_FACTORY_ADDRESS` - Deployed factory address
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy auth (frontend)
