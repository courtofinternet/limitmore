import { Abi, createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';
import BetFactoryArtifact from '../contracts/BetFactoryCOFI.json';
import BetArtifact from '../contracts/BetCOFI.json';

const FACTORY_ADDRESS =
    process.env.NEXT_PUBLIC_BET_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';

const FACTORY_ABI = (BetFactoryArtifact as { abi: Abi }).abi as Abi;
const BET_ABI = (BetArtifact as { abi: Abi }).abi as Abi;

async function getWalletClient() {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No wallet provider found');
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

function isFactoryStubbed() {
    const isZero = FACTORY_ADDRESS === '0x0000000000000000000000000000000000000000';
    const hasAbi = Array.isArray(FACTORY_ABI) && FACTORY_ABI.length > 0;
    return isZero || !hasAbi;
}

export async function createBet(params: {
    title: string;
    resolutionCriteria: string;
    sideAName: string;
    sideBName: string;
    endDate: number; // seconds
    resolutionType: number;
    resolutionData: `0x${string}`;
}) {
    if (isFactoryStubbed()) {
        return;
    }
    const { client, account } = await getWalletClient();
    await client.writeContract({
        chain: baseSepolia,
        account,
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'createBet',
        args: [
            params.title,
            params.resolutionCriteria,
            params.sideAName,
            params.sideBName,
            BigInt(params.endDate),
            params.resolutionType,
            params.resolutionData
        ]
    });
}

export async function setCreatorApproval(creator: `0x${string}`, approved: boolean) {
    if (isFactoryStubbed()) {
        return;
    }
    const { client, account } = await getWalletClient();
    await client.writeContract({
        chain: baseSepolia,
        account,
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'setCreatorApproval',
        args: [creator, approved]
    });
}

export async function resolveBet(betAddress: `0x${string}`) {
    const { client, account } = await getWalletClient();
    await client.writeContract({
        chain: baseSepolia,
        account,
        address: betAddress,
        abi: BET_ABI,
        functionName: 'resolve',
        args: []
    });
}
