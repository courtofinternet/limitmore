import React from 'react';
import styles from './Header.module.css';
import { useWallet } from '../../providers/WalletProvider';
import { readContract } from 'wagmi/actions';
import { erc20Abi } from 'viem';
import { wagmiConfig } from '../../../lib/onchain/wagmiConfig';
import { baseSepolia } from 'wagmi/chains';

// Base Sepolia USDC contract address
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

interface HeaderProps {
    onNavigate: (page: 'landing' | 'markets') => void;
    currentPage: 'landing' | 'markets';
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
    const { isConnected, walletAddress, isConnecting, connect, disconnect } = useWallet();
    const [usdcBalance, setUsdcBalance] = React.useState<bigint | undefined>(undefined);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : '';

    // Fetch USDC balance
    const fetchUsdcBalance = React.useCallback(async () => {
        if (!walletAddress || !isConnected) {
            setUsdcBalance(undefined);
            return;
        }

        try {
            const balance = await readContract(wagmiConfig, {
                chainId: baseSepolia.id,
                address: USDC_CONTRACT_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`]
            });
            setUsdcBalance(balance);
        } catch (error) {
            console.error('Failed to fetch USDC balance:', error);
            setUsdcBalance(undefined);
        }
    }, [walletAddress, isConnected]);

    // Fetch balance when wallet connects/disconnects
    React.useEffect(() => {
        fetchUsdcBalance();
    }, [fetchUsdcBalance]);

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div
                    className={styles.logo}
                    onClick={() => onNavigate('landing')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <img src="/favicon.ico" alt="Logo" style={{ width: '24px', height: '24px' }} />
                    <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>Limitmore</h1>
                </div>
                <nav className={styles.nav}>
                    <span
                        className={`${styles.navItem} ${currentPage === 'markets' ? styles.active : ''}`}
                        onClick={() => onNavigate('markets')}
                    >
                        Markets
                    </span>
                </nav>
            </div>
            <div className={styles.right}>
                {isConnected && usdcBalance !== undefined && (
                    <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginRight: '16px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                    </div>
                )}
                {isConnected ? (
                    <button className={styles.walletButton} onClick={disconnect}>
                        {shortAddress}
                    </button>
                ) : (
                    <button className={styles.walletButton} onClick={connect} disabled={isConnecting}>
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
