# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Limitmore is a binary prediction market platform on Base blockchain. Users create markets with two sides (A/B), bet using MockUSDL tokens, and winners receive proportional payouts. Resolution is handled by GenLayer oracles via a cross-chain bridge.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │   Bridge Svc    │     │    GenLayer     │
│   (Next.js)     │     │   (Node.js)     │     │    (Oracle)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────────────────────────────┐              │
│           Base Sepolia                   │              │
│  ┌─────────────┐    ┌───────────────┐   │              │
│  │BetFactoryCOFI│───▶│   BetCOFI     │   │◀─────────────┘
│  └─────────────┘    └───────────────┘   │   (via LayerZero)
│         │                               │
│         ▼                               │
│  ┌─────────────┐                        │
│  │ MockUSDL    │                        │
│  └─────────────┘                        │
└─────────────────────────────────────────┘
```

## Commands

### Contracts (`/contracts`)
```bash
npm run compile                # Compile + sync artifacts to frontend
npm run test                   # Run Hardhat tests
npm run deploy:factory:sepolia # Deploy BetFactoryCOFI to Base Sepolia
```

### Bridge Service (`/bridge/service`)
```bash
npm run dev        # Start relay service
npm run test:e2e   # Full resolution flow test
```

### Frontend (`/frontend`)
```bash
npm run dev    # Start dev server at localhost:3000
npm run build  # Production build
```

## Key Contracts

**BetFactoryCOFI** - Factory that creates BetCOFI instances, routes bets, receives bridge messages
**BetCOFI** - Individual prediction market with states: ACTIVE → RESOLVING → RESOLVED/UNDETERMINED
**MockUSDL** - Test ERC20 token with `drip()` faucet function

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| BetFactoryCOFI | `0x5449292eed27EdF893Ce726a22Ff50877dC103F6` |
| MockUSDL | `0xeA2d0cb43E1a8462C4958657Dd13f300A73574f7` |
| BridgeReceiver | `0x57E892519a67C44661533fCBCc40A1AeaFE7f529` |

## Environment Variables

**contracts/.env**: `PRIVATE_KEY`, `FACTORY_ADDRESS`, `MOCK_USDL_ADDRESS`, `BRIDGE_RECEIVER_ADDRESS`
**bridge/service/.env**: `BET_FACTORY_ADDRESS`, `BRIDGE_FORWARDER_ADDRESS`, `BRIDGE_SENDER_ADDRESS`, `PRIVATE_KEY`
**frontend/.env.local**: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_BET_FACTORY_ADDRESS`

## Resolution Flow

1. User calls `bet.resolve()` after betting ends
2. Factory emits `ResolutionRequested` event
3. Bridge service deploys oracle to GenLayer
4. Oracle fetches price data and determines winner
5. Result relayed back via LayerZero to BridgeReceiver
6. Factory calls `bet.setResolution()` to finalize

## Testing Scripts

```bash
# Create a test bet
FACTORY_ADDRESS=0x... npx hardhat run scripts/create-bet.ts --network baseSepolia

# Place a bet
FACTORY_ADDRESS=0x... BET_ADDRESS=0x... SIDE=A AMOUNT=1000000 npx hardhat run scripts/place-bet.ts --network baseSepolia

# Get testnet tokens
npx hardhat run scripts/mint-usdl.ts --network baseSepolia
```
