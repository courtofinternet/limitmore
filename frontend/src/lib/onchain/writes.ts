// Centralized write helpers for Base chain integration.
// Replace placeholders with real contract details when ready.

import { Abi } from 'viem';
import { writeContract } from 'wagmi/actions';
import { baseSepolia } from 'wagmi/chains';
import { wagmiConfig } from './wagmiConfig';

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

// Early return while ABI/address are placeholders to avoid throwing
function isStubbed() {
    const hasAbi = Array.isArray(BET_ABI) && BET_ABI.length > 0;
    return !hasAbi;
}

export async function placeBet(betAddress: `0x${string}`, outcome: 'YES' | 'NO', amount: number): Promise<void> {
    if (isStubbed()) {
        console.log('[trade] placeBet (stub)', { betAddress, outcome, amount });
        return;
    }

    const amountInUnits = BigInt(Math.floor(amount * 1_000_000)); // assuming 6 decimals for USDC
    await writeContract(wagmiConfig, {
        chainId: baseSepolia.id,
        address: betAddress,
        abi: BET_ABI,
        functionName: 'placeBet',
        args: [outcome === 'YES', amountInUnits]
    });
}

export async function claimRewards(betAddress: `0x${string}`): Promise<void> {
    if (isStubbed()) {
        console.log('[trade] claimRewards (stub)', { betAddress });
        return;
    }

    await writeContract(wagmiConfig, {
        chainId: baseSepolia.id,
        address: betAddress,
        abi: BET_ABI,
        functionName: 'claim',
        args: []
    });
}
