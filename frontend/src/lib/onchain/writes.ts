// Centralized write helpers for Base chain integration.
// Replace placeholders with real contract details when ready.

import { Abi, createWalletClient, custom, createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import BetFactoryArtifact from '../contracts/BetFactoryCOFI.json';
import { USDC_ADDRESS, FACTORY_ADDRESS, ERC20_ABI, USDC_MULTIPLIER } from '../constants';

const BET_ABI = [
    {
        type: 'function',
        name: 'placeBet',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'onSideA', type: 'bool', internalType: 'bool' },
            { name: 'amount', type: 'uint256', internalType: 'uint256' }
        ],
        outputs: []
    },
    {
        type: 'function',
        name: 'claim',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: []
    }
] as const satisfies Abi;

const FACTORY_ABI = (BetFactoryArtifact as { abi: Abi }).abi as Abi;

// Early return while ABI/address are placeholders to avoid throwing
function isStubbed() {
    const hasAbi = Array.isArray(BET_ABI) && BET_ABI.length > 0;
    return !hasAbi;
}

function isFactoryConfigured() {
    const isZero = FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000';
    const hasAbi = Array.isArray(FACTORY_ABI) && FACTORY_ABI.length > 0;
    return !isZero && hasAbi;
}

async function getWalletClient() {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No wallet provider found. Please connect a wallet.');
    }
    const client = createWalletClient({
        chain: baseSepolia,
        transport: custom((window as any).ethereum)
    });
    const [account] = await client.getAddresses();
    if (!account) {
        throw new Error('Wallet not connected');
    }
    return { client, account: account as `0x${string}` };
}

function getPublicClient() {
    return createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
    });
}

export async function placeBet(betAddress: `0x${string}`, outcome: 'YES' | 'NO', amount: number): Promise<void> {
    if (isStubbed()) {
        return;
    }

    if (!isFactoryConfigured()) {
        throw new Error('Factory address/ABI not configured. Cannot place bet.');
    }

    const amountInUnits = BigInt(Math.floor(amount * USDC_MULTIPLIER));
    const { client, account } = await getWalletClient();
    await client.writeContract({
        chain: baseSepolia,
        account,
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'placeBet',
        args: [betAddress, outcome === 'YES', amountInUnits]
    });
}

export async function claimRewards(betAddress: `0x${string}`): Promise<void> {
    if (isStubbed()) {
        return;
    }

    const { client, account } = await getWalletClient();
    await client.writeContract({
        chain: baseSepolia,
        account,
        address: betAddress,
        abi: BET_ABI,
        functionName: 'claim',
        args: []
    });
}

// USDC Approval Functions

export async function checkUsdcAllowance(userAddress: `0x${string}`, spenderAddress: `0x${string}`): Promise<bigint> {
    const publicClient = getPublicClient();
    const allowance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, spenderAddress]
    });
    return allowance as bigint;
}

export async function checkUsdcBalance(userAddress: `0x${string}`): Promise<bigint> {
    const publicClient = getPublicClient();
    const balance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
    });
    return balance as bigint;
}

export async function approveUsdcUnlimited(spenderAddress: `0x${string}`): Promise<void> {
    const { client, account } = await getWalletClient();
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    await client.writeContract({
        chain: baseSepolia,
        account,
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, maxUint256]
    });
}

export async function isLegitBet(betAddress: `0x${string}`): Promise<boolean> {
    if (!isFactoryConfigured()) {
        throw new Error('Factory address/ABI not configured. Cannot validate bet.');
    }

    const publicClient = getPublicClient();
    const result = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'isLegitBet',
        args: [betAddress]
    });
    return result as boolean;
}

