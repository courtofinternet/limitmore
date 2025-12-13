// Market States (aligned with contract BetStatus)
export type MarketState = 'ACTIVE' | 'RESOLVING' | 'RESOLVED' | 'UNDETERMINED';
export type MarketOutcome = 'YES' | 'NO' | 'INVALID';

// User Position Interface
export interface UserPosition {
    marketId: number;
    walletAddress: string;
    outcome: 'YES' | 'NO';
    amount: number; // USDC amount bet
    betTimestamp: number; // Unix timestamp
    claimed?: boolean; // For finalized winning positions
}

// TODO_TEMP: Hardcoded user wallet address - replace with real wallet connection
export const MOCK_USER_WALLET = "0x742d35Cc6634C0532925a3b8D0b8AC8c8C4fE1e0";

// TODO_TEMP: Mock user positions - replace with real blockchain data
export const MOCK_USER_POSITIONS: UserPosition[] = [
    {
        marketId: 1, // Bitcoin above $100k - Active market
        walletAddress: MOCK_USER_WALLET,
        outcome: 'YES',
        amount: 500,
        betTimestamp: 1697529600, // Oct 2023
    },
    {
        marketId: 2, // Ethereum ETF - Active market
        walletAddress: MOCK_USER_WALLET,
        outcome: 'NO',
        amount: 250,
        betTimestamp: 1697616000, // Oct 2023
    },
    {
        marketId: 4, // Apple above $250 - Will be finalized with user loss
        walletAddress: MOCK_USER_WALLET,
        outcome: 'YES',
        amount: 1000,
        betTimestamp: 1697702400, // Oct 2023
    },
    {
        marketId: 6, // Tesla hits $400 - Will be finalized with user win
        walletAddress: MOCK_USER_WALLET,
        outcome: 'YES',
        amount: 750,
        betTimestamp: 1697788800, // Oct 2023
        claimed: false, // User hasn't claimed winnings yet
    },
    {
        marketId: 10, // NVIDIA $4T market cap - Will be finalized with user win
        walletAddress: MOCK_USER_WALLET,
        outcome: 'YES',
        amount: 2000,
        betTimestamp: 1697875200, // Oct 2023
        claimed: true, // User already claimed
    }
];

// Blockchain-aligned Schema
export interface MarketData {
    // Identity
    id: number;                 // Keep ID for routing convenience
    contractId: string;         // On-chain address or ID
    title: string;
    ticker: string;
    description: string;

    // Categorization
    type: 'crypto' | 'stock' | 'other';
    category: 'CRYPTO' | 'STOCKS'; // STOCKS corresponds to Economy in UI
    identifier: string;         // CoinGecko ID or TradingView Symbol

    // Rules
    deadline: number;           // Unix Timestamp (Seconds)
    resolutionSource: string;
    resolutionRule: string;

    // Market State (Dynamic)
    liquidity: number;          // USDC
    volume: number;             // USDC

    // Market State
    state: MarketState;         // Current market state
    resolvedOutcome?: MarketOutcome; // Only set when state is 'RESOLVED'
    deadlinePrice?: number;     // Price at deadline (only for finalized markets)
    priceSymbol?: string;       // Price symbol (e.g. "$", "$T", etc.)
    statsLoading?: boolean;     // Optional flag for incremental stats loading

    // Outcome
    probYes: number;            // 0.0 - 1.0 (Real probability)
    probNo: number;             // 0.0 - 1.0
    percentChange: number;      // 24h change
}

export const MOCK_MARKETS: MarketData[] = [
    // Crypto
    {
        id: 1,
        contractId: "0x123...abc",
        title: "Bitcoin above $100k by EOY?",
        ticker: "BTC",
        description: "Will Bitcoin trade above $100,000 USD on Coinbase before Dec 31, 2025?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "bitcoin",
        deadline: 1767139200, // Dec 31 2025
        resolutionSource: "CoinMarketCap",
        resolutionRule: "Market resolves to YES if BTC/USD > 100,000 at expiration.",
        liquidity: 4500000,
        volume: 3200000,
        state: 'ACTIVE', // Active - deadline in future
        probYes: 0.654,
        probNo: 0.346,
        percentChange: 2.1
    },
    {
        id: 2,
        contractId: "0x456...def",
        title: "Ethereum ETF inflows > $5B in Q1?",
        ticker: "ETH",
        description: "Will net inflows for Ethereum ETFs exceed $5 Billion in Q1 2025?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "ethereum",
        deadline: 1734480000, // Dec 18 2024 - deadline passed, resolvable
        resolutionSource: "Bloomberg",
        resolutionRule: "Resolves YES if aggregate net inflows > $5B.",
        liquidity: 1200000,
        volume: 1800000,
        state: 'ACTIVE', // Resolvable - deadline passed
        probYes: 0.421,
        probNo: 0.579,
        percentChange: -0.5
    },
    {
        id: 3,
        contractId: "0x789...ghi",
        title: "Monad TGE before June 2025?",
        ticker: "MON",
        description: "Will Monad conduct its Token Generation Event before June 30, 2025?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "monad",
        deadline: 1751241600, // June 30 2025
        resolutionSource: "Official Announcement",
        resolutionRule: "Resolves YES if TGE occurs on or before date.",
        liquidity: 800000,
        volume: 500000,
        state: 'RESOLVING', // Currently being resolved
        probYes: 0.885,
        probNo: 0.115,
        percentChange: 5.4
    },
    // Stocks
    {
        id: 4,
        contractId: "0xabc...jkl",
        title: "Apple (AAPL) above $250 by Jan 1?",
        ticker: "AAPL",
        description: "Will Apple Inc. stock close above $250 on Jan 1, 2026?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:AAPL",
        deadline: 1730419200, // Nov 1 2024 - finalized
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if AAPL close price > $250.",
        liquidity: 500000,
        volume: 450000,
        state: 'RESOLVED',
        resolvedOutcome: 'NO', // User bet YES but market resolved NO - user lost
        deadlinePrice: 245.50,
        priceSymbol: "$",
        probYes: 0.152,
        probNo: 0.848,
        percentChange: -1.2
    },
    {
        id: 5,
        contractId: "0xdef...mno",
        title: "Google (GOOG) breaks $200 mark?",
        ticker: "GOOG",
        description: "Will Alphabet Inc. Class C stock trade above $200?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:GOOG",
        deadline: 1767225600,
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if GOOG > $200.",
        liquidity: 300000,
        volume: 210000,
        state: 'ACTIVE', // Active market
        probYes: 0.328,
        probNo: 0.672,
        percentChange: 0.8
    },
    {
        id: 6,
        contractId: "0xghi...pqr",
        title: "Tesla (TSLA) hits $400 in Q1?",
        ticker: "TSLA",
        description: "Will Tesla stock reach a price of $400 or higher in Q1 2025?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:TSLA",
        deadline: 1732147200, // Nov 21 2024 - finalized
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if TSLA high >= $400.",
        liquidity: 2000000,
        volume: 1500000,
        state: 'RESOLVED',
        resolvedOutcome: 'YES', // User bet YES and market resolved YES - user won
        deadlinePrice: 420.75,
        priceSymbol: "$",
        probYes: 0.555,
        probNo: 0.445,
        percentChange: 3.2
    },
    // More Crypto
    {
        id: 7,
        contractId: "0xjkl...stu",
        title: "Solana (SOL) flips BNB by market cap?",
        ticker: "SOL",
        description: "Will Solana's market cap exceed BNB's market cap?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "solana",
        deadline: 1767139200,
        resolutionSource: "CoinGecko",
        resolutionRule: "Resolves YES if SOL market cap > BNB market cap.",
        liquidity: 600000,
        volume: 890000,
        state: 'ACTIVE', // Active market
        probYes: 0.254,
        probNo: 0.746,
        percentChange: 1.5
    },
    {
        id: 8,
        contractId: "0xmno...vwx",
        title: "XRP wins SEC case definitively?",
        ticker: "XRP",
        description: "Will the SEC vs Ripple case conclude with a definitive win for Ripple?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "ripple",
        deadline: 1767139200,
        resolutionSource: "Court Filings",
        resolutionRule: "Resolves YES if final judgment favors Ripple.",
        liquidity: 2500000,
        volume: 2100000,
        state: 'ACTIVE', // Active market
        probYes: 0.121,
        probNo: 0.879,
        percentChange: -0.3
    },
    {
        id: 9,
        contractId: "0xpqr...yz1",
        title: "Chainlink (LINK) to reach $25 in Q1?",
        ticker: "LINK",
        description: "Will Chainlink price exceed $25 in Q1 2025?",
        type: 'crypto',
        category: 'CRYPTO',
        identifier: "chainlink",
        deadline: 1734220800, // Dec 15 2024 - deadline passed, resolvable
        resolutionSource: "CoinMarketCap",
        resolutionRule: "Resolves YES if LINK > $25.",
        liquidity: 200000,
        volume: 150000,
        state: 'ACTIVE', // Resolvable - deadline passed
        probYes: 0.682,
        probNo: 0.318,
        percentChange: 4.0
    },
    // More Stocks
    {
        id: 10,
        contractId: "0xstu...234",
        title: "NVIDIA (NVDA) reaches $4T market cap?",
        ticker: "NVDA",
        description: "Will NVIDIA Corporation market capitalization exceed $4 Trillion?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:NVDA",
        deadline: 1731542400, // Nov 14 2024 - finalized
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if Market Cap > $4T.",
        liquidity: 8000000,
        volume: 5500000,
        state: 'RESOLVED',
        resolvedOutcome: 'YES', // User bet YES and won, already claimed
        deadlinePrice: 4.2,
        priceSymbol: "$T",
        probYes: 0.755,
        probNo: 0.245,
        percentChange: 1.8
    },
    {
        id: 11,
        contractId: "0xvwx...567",
        title: "Microsoft (MSFT) AI revenue > $20B?",
        ticker: "MSFT",
        description: "Will Microsoft report AI-segment revenue greater than $20 Billion?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:MSFT",
        deadline: 1767225600,
        resolutionSource: "Earnings Report",
        resolutionRule: "Resolves YES if AI revenue > $20B in 10-K.",
        liquidity: 1500000,
        volume: 1200000,
        state: 'ACTIVE', // Active market
        probYes: 0.600,
        probNo: 0.400,
        percentChange: 0.5
    },
    {
        id: 12,
        contractId: "0xyz1...890",
        title: "Coinbase (COIN) earnings beat estimates?",
        ticker: "COIN",
        description: "Will Coinbase report EPS higher than analyst consensus?",
        type: 'stock',
        category: 'STOCKS',
        identifier: "NASDAQ:COIN",
        deadline: 1734307200, // Dec 16 2024 - deadline passed, resolvable
        resolutionSource: "Earnings Call",
        resolutionRule: "Resolves YES if reported EPS > Consensus.",
        liquidity: 1000000,
        volume: 900000,
        state: 'ACTIVE', // Resolvable - deadline passed
        probYes: 0.458,
        probNo: 0.542,
        percentChange: -1.5
    }
];

// Utility Functions for Market State and User Positions
export function isDeadlineReached(deadline: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp
    return currentTime >= deadline;
}

export function getActualMarketState(market: MarketData): MarketState {
    return market.state;
}

export function getUserPosition(marketId: number, walletAddress: string = MOCK_USER_WALLET): UserPosition | null {
    return MOCK_USER_POSITIONS.find(
        position => position.marketId === marketId && position.walletAddress === walletAddress
    ) || null;
}

export function calculateUserWinnings(position: UserPosition, market: MarketData): number {
    if (market.state !== 'RESOLVED' || !market.resolvedOutcome) {
        return 0;
    }

    // User wins if their bet matches the resolved outcome
    if (position.outcome === market.resolvedOutcome) {
        // Calculate winnings based on odds at the time
        // Simple calculation: amount / probability of chosen outcome
        const winningOdds = position.outcome === 'YES' ? market.probYes : market.probNo;
        return position.amount / winningOdds;
    }

    return 0; // User lost
}

export function didUserWin(position: UserPosition, market: MarketData): boolean {
    return market.state === 'RESOLVED' &&
           market.resolvedOutcome === position.outcome;
}

export function didUserLose(position: UserPosition, market: MarketData): boolean {
    return market.state === 'RESOLVED' &&
           market.resolvedOutcome !== position.outcome;
}

export function canUserClaim(position: UserPosition, market: MarketData): boolean {
    return didUserWin(position, market) && !position.claimed;
}

export function getUserMarketStatus(marketId: number, walletAddress: string = MOCK_USER_WALLET) {
    const market = MOCK_MARKETS.find(m => m.id === marketId);
    const position = getUserPosition(marketId, walletAddress);

    if (!market) return null;

    return {
        market,
        position,
        hasPosition: !!position,
        actualState: getActualMarketState(market),
        userWon: position ? didUserWin(position, market) : false,
        userLost: position ? didUserLose(position, market) : false,
        canClaim: position ? canUserClaim(position, market) : false,
        potentialWinnings: position ? calculateUserWinnings(position, market) : 0
    };
}

// TODO_TEMP: Mock functions for future blockchain integration
// Centralized writes now live in src/lib/onchain/writes.ts
export { resolveMarket, claimRewards, placeBet } from '../lib/onchain/writes';
