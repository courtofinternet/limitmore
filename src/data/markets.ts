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
    category: 'Crypto' | 'Economy';
    identifier: string;         // CoinGecko ID or TradingView Symbol

    // Rules
    deadline: number;           // Unix Timestamp (Seconds)
    resolutionSource: string;
    resolutionRule: string;

    // Market State (Dynamic)
    liquidity: number;          // USDC
    volume: number;             // USDC

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
        category: 'Crypto',
        identifier: "bitcoin",
        deadline: 1767139200, // Dec 31 2025
        resolutionSource: "CoinMarketCap",
        resolutionRule: "Market resolves to YES if BTC/USD > 100,000 at expiration.",
        liquidity: 4500000,
        volume: 3200000,
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
        category: 'Crypto',
        identifier: "ethereum",
        deadline: 1743465600, // Mar 31 2025
        resolutionSource: "Bloomberg",
        resolutionRule: "Resolves YES if aggregate net inflows > $5B.",
        liquidity: 1200000,
        volume: 1800000,
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
        category: 'Crypto',
        identifier: "monad",
        deadline: 1751241600, // June 30 2025
        resolutionSource: "Official Announcement",
        resolutionRule: "Resolves YES if TGE occurs on or before date.",
        liquidity: 800000,
        volume: 500000,
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
        category: 'Economy',
        identifier: "NASDAQ:AAPL",
        deadline: 1767225600, // Jan 1 2026
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if AAPL close price > $250.",
        liquidity: 500000,
        volume: 450000,
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
        category: 'Economy',
        identifier: "NASDAQ:GOOG",
        deadline: 1767225600,
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if GOOG > $200.",
        liquidity: 300000,
        volume: 210000,
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
        category: 'Economy',
        identifier: "NASDAQ:TSLA",
        deadline: 1743465600,
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if TSLA high >= $400.",
        liquidity: 2000000,
        volume: 1500000,
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
        category: 'Crypto',
        identifier: "solana",
        deadline: 1767139200,
        resolutionSource: "CoinGecko",
        resolutionRule: "Resolves YES if SOL market cap > BNB market cap.",
        liquidity: 600000,
        volume: 890000,
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
        category: 'Crypto',
        identifier: "ripple",
        deadline: 1767139200,
        resolutionSource: "Court Filings",
        resolutionRule: "Resolves YES if final judgment favors Ripple.",
        liquidity: 2500000,
        volume: 2100000,
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
        category: 'Crypto',
        identifier: "chainlink",
        deadline: 1743465600,
        resolutionSource: "CoinMarketCap",
        resolutionRule: "Resolves YES if LINK > $25.",
        liquidity: 200000,
        volume: 150000,
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
        category: 'Economy',
        identifier: "NASDAQ:NVDA",
        deadline: 1767225600,
        resolutionSource: "Nasdaq",
        resolutionRule: "Resolves YES if Market Cap > $4T.",
        liquidity: 8000000,
        volume: 5500000,
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
        category: 'Economy',
        identifier: "NASDAQ:MSFT",
        deadline: 1767225600,
        resolutionSource: "Earnings Report",
        resolutionRule: "Resolves YES if AI revenue > $20B in 10-K.",
        liquidity: 1500000,
        volume: 1200000,
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
        category: 'Economy',
        identifier: "NASDAQ:COIN",
        deadline: 1743465600,
        resolutionSource: "Earnings Call",
        resolutionRule: "Resolves YES if reported EPS > Consensus.",
        liquidity: 1000000,
        volume: 900000,
        probYes: 0.458,
        probNo: 0.542,
        percentChange: -1.5
    }
];
