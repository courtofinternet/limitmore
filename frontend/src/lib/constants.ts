// Shared constants for the application
import { Abi } from 'viem';

// Contract addresses on Base Sepolia
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_BET_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';

// Standard ERC20 ABI (minimal - only functions we need)
export const ERC20_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }]
    },
    {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address', internalType: 'address' },
            { name: 'amount', type: 'uint256', internalType: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }]
    },
    {
        type: 'function',
        name: 'allowance',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address', internalType: 'address' },
            { name: 'spender', type: 'address', internalType: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }]
    }
] as const satisfies Abi;

// USDC token configuration
export const USDC_DECIMALS = 6;
export const USDC_MULTIPLIER = 1_000_000; // 10^6 for 6 decimals