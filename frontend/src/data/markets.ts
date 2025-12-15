// Shared types for markets (aligned to BetCOFI / factory contracts)

export type MarketState = 'ACTIVE' | 'RESOLVING' | 'RESOLVED' | 'UNDETERMINED';
export type MarketOutcome = 'YES' | 'NO' | 'INVALID';

export interface MarketData {
    id: string; // contract address as ID
    contractId: string;
    title: string;
    ticker: string;
    sideAName?: string;
    sideBName?: string;
    description: string;
    type: 'crypto' | 'stock' | 'other';
    category: 'CRYPTO' | 'STOCKS';
    identifier: string;
    deadline: number | string;
    deadlineDate?: string;
    resolutionSource: string;
    resolutionRule: string;
    liquidity: number;
    volume: number;
    state: MarketState;
    resolvedOutcome?: MarketOutcome;
    deadlinePrice?: number;
    priceSymbol?: string;
    statsLoading?: boolean;
    probYes: number;
    probNo: number;
    percentChange: number;
}

export interface UserPosition {
    amount: number;
    outcome: 'YES' | 'NO';
    claimed?: boolean;
}

export interface UserMarketStatus {
    position?: UserPosition;
    hasPosition: boolean;
    userWon: boolean;
    canClaim: boolean;
    potentialWinnings: number;
}

// Placeholder user helpers until on-chain position reads are implemented
export function getUserMarketStatus(_marketId?: string, _wallet?: string): UserMarketStatus | null {
    return null;
}

export { claimRewards, placeBet } from '../lib/onchain/writes';
