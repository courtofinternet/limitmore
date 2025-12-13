// Centralized read helpers for Base chain integration.
// Factory contract: status-based address lists.
// Market contract: per-bet metadata and totals.

import { Abi } from 'viem';
import { readContract } from 'wagmi/actions';
import { baseSepolia } from 'wagmi/chains';
import { wagmiConfig } from './wagmiConfig';
import type { MarketData, MarketState, MarketOutcome } from '../../data/markets';
import { MOCK_MARKETS } from '../../data/markets';

const FACTORY_ADDRESS =
    process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';
const FACTORY_ABI = [
    {
        type: 'function',
        name: 'getBetsByStatus',
        stateMutability: 'view',
        inputs: [{ name: 'status', type: 'uint8', internalType: 'uint8' }],
        outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }]
    }
] as const satisfies Abi;

const BET_ABI = [
    {
        type: 'function',
        name: 'getInfo',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: '_creator', type: 'address', internalType: 'address' },
            { name: '_title', type: 'string', internalType: 'string' },
            { name: '_resolutionCriteria', type: 'string', internalType: 'string' },
            { name: '_sideAName', type: 'string', internalType: 'string' },
            { name: '_sideBName', type: 'string', internalType: 'string' },
            { name: '_creationDate', type: 'uint256', internalType: 'uint256' },
            { name: '_endDate', type: 'uint256', internalType: 'uint256' },
            { name: '_isResolved', type: 'bool', internalType: 'bool' },
            { name: '_isSideAWinner', type: 'bool', internalType: 'bool' },
            { name: '_totalSideA', type: 'uint256', internalType: 'uint256' },
            { name: '_totalSideB', type: 'uint256', internalType: 'uint256' }
        ]
    },
    {
        type: 'function',
        name: 'status',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }]
    },
    {
        type: 'function',
        name: 'resolutionType',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }]
    }
] as const satisfies Abi;

const STUB_DELAY_MS = 1500;

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFactoryStubbed() {
    const isZero = FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000';
    const hasAbi = Array.isArray(FACTORY_ABI) && FACTORY_ABI.length > 0;
    return isZero || !hasAbi;
}

function isBetStubbed() {
    const hasAbi = Array.isArray(BET_ABI) && BET_ABI.length > 0;
    return !hasAbi;
}

const StatusMap: Record<number, MarketState> = {
    0: 'ACTIVE',
    1: 'RESOLVING',
    2: 'RESOLVED',
    3: 'UNDETERMINED'
};

function parseStatus(code: number): MarketState {
    return StatusMap[code] ?? 'UNDETERMINED';
}

function computeProb(totalA: number, totalB: number) {
    const vol = totalA + totalB;
    if (vol === 0) return { probYes: 0.5, probNo: 0.5, volume: 0 };
    const probYes = totalA / vol;
    return { probYes, probNo: 1 - probYes, volume: vol };
}

// Fetch bet addresses for a given status from factory
export async function fetchBetAddressesByStatus(status: MarketState): Promise<`0x${string}`[]> {
    if (isFactoryStubbed()) {
        await delay(STUB_DELAY_MS);
        return MOCK_MARKETS.filter((m) => m.state === status).map((m) => m.contractId as `0x${string}`);
    }

    const raw = await readContract(wagmiConfig, {
        chainId: baseSepolia.id,
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getBetsByStatus',
        args: [Number(Object.entries(StatusMap).find(([, v]) => v === status)?.[0] ?? 0)]
    });

    return raw as `0x${string}`[];
}

// Fetch a single market info from its contract
async function fetchMarketInfo(betAddress: `0x${string}`, fallback?: MarketData): Promise<MarketData> {
    if (isBetStubbed()) {
        await delay(STUB_DELAY_MS);
        if (fallback) return fallback;
        return MOCK_MARKETS[0];
    }

    const [info, statusCode] = await Promise.all([
        readContract(wagmiConfig, {
            chainId: baseSepolia.id,
            address: betAddress,
            abi: BET_ABI,
            functionName: 'getInfo'
        }),
        readContract(wagmiConfig, {
            chainId: baseSepolia.id,
            address: betAddress,
            abi: BET_ABI,
            functionName: 'status'
        })
    ]);

    const [
        _creator,
        _title,
        _resolutionCriteria,
        _sideAName,
        _sideBName,
        _creationDate,
        _endDate,
        _isResolved,
        _isSideAWinner,
        _totalSideA,
        _totalSideB
    ] = info as unknown as [
        string,
        string,
        string,
        string,
        string,
        bigint,
        bigint,
        boolean,
        boolean,
        bigint,
        bigint
    ];

    const totals = computeProb(Number(_totalSideA), Number(_totalSideB));
    const status = parseStatus(Number(statusCode));
    let resolvedOutcome: MarketOutcome | undefined = undefined;
    if (status === 'RESOLVED') {
        resolvedOutcome = _isSideAWinner ? 'YES' : 'NO';
    }
    if (status === 'UNDETERMINED') {
        resolvedOutcome = 'INVALID';
    }

    return {
        id: fallback?.id ?? 0,
        contractId: betAddress,
        title: _title,
        ticker: '',
        description: _resolutionCriteria,
        type: 'other',
        category: 'CRYPTO', // unknown here; override from fallback if present
        identifier: '',
        deadline: Number(_endDate),
        resolutionSource: '',
        resolutionRule: '',
        liquidity: 0,
        volume: totals.volume,
        state: status,
        resolvedOutcome,
        deadlinePrice: undefined,
        priceSymbol: '$',
        probYes: totals.probYes,
        probNo: totals.probNo,
        percentChange: 0,
        statsLoading: false
    };
}

// Fetch markets by status (factory -> addresses -> per-bet info)
export async function fetchMarketsByStatus(status: MarketState): Promise<MarketData[]> {
    const useStub = isFactoryStubbed() || isBetStubbed();
    if (useStub) {
        await delay(STUB_DELAY_MS);
        return MOCK_MARKETS.filter((m) => m.state === status);
    }

    const addresses = await fetchBetAddressesByStatus(status);
    const markets = await Promise.all(
        addresses.map(async (addr) => {
            const fallback = MOCK_MARKETS.find((m) => m.contractId.toLowerCase() === addr.toLowerCase());
            const m = await fetchMarketInfo(addr, fallback);
            // preserve known fields from fallback when available
            if (fallback) {
                return {
                    ...m,
                    id: fallback.id,
                    type: fallback.type,
                    category: fallback.category,
                    identifier: fallback.identifier,
                    resolutionSource: fallback.resolutionSource,
                    resolutionRule: fallback.resolutionRule,
                    deadlinePrice: fallback.deadlinePrice ?? m.deadlinePrice,
                    liquidity: fallback.liquidity ?? m.liquidity,
                    priceSymbol: fallback.priceSymbol ?? m.priceSymbol
                };
            }
            return m;
        })
    );
    return markets;
}

// Combined fetch for UI needs across statuses
export async function fetchAllMarkets(statuses: MarketState[] = ['ACTIVE', 'RESOLVING', 'RESOLVED', 'UNDETERMINED']) {
    const results = await Promise.all(statuses.map((s) => fetchMarketsByStatus(s)));
    return results.flat();
}
