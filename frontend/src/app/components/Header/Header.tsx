import React from 'react';
import styles from './Header.module.css';
import { useWallet } from '../../providers/WalletProvider';
import { useToast } from '../../providers/ToastProvider';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../../../lib/onchain/wagmiConfig';
import { baseSepolia } from 'wagmi/chains';
import DisconnectIcon from '../Shared/DisconnectIcon';
import TopUpIcon from '../Shared/TopUpIcon';
import InfoIcon from '../Shared/InfoIcon';
import Tooltip from '../Shared/Tooltip';
import { USDL_ADDRESS, MOCK_USDL_ABI, USDL_MULTIPLIER } from '../../../lib/constants';
import { dripUsdl } from '../../../lib/onchain/writes';

interface HeaderProps {
    onNavigate: (page: 'landing' | 'markets') => void;
    currentPage: 'landing' | 'markets';
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
    const { isConnected, walletAddress, isConnecting, connect, disconnect } = useWallet();
    const { showToast } = useToast();
    const [usdlBalance, setUsdlBalance] = React.useState<bigint | undefined>(undefined);
    const [isDripping, setIsDripping] = React.useState(false);
    const [walletDropdownOpen, setWalletDropdownOpen] = React.useState(false);
    const [balanceDropdownOpen, setBalanceDropdownOpen] = React.useState(false);
    const walletRef = React.useRef<HTMLDivElement>(null);
    const balanceRef = React.useRef<HTMLDivElement>(null);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : '';

    // Fetch USDL balance
    const fetchUsdlBalance = React.useCallback(async () => {
        if (!walletAddress || !isConnected) {
            setUsdlBalance(undefined);
            return;
        }

        try {
            const balance = await readContract(wagmiConfig, {
                chainId: baseSepolia.id,
                address: USDL_ADDRESS,
                abi: MOCK_USDL_ABI,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`]
            });
            setUsdlBalance(balance);
        } catch (error) {
            console.error('Failed to fetch USDL balance:', error);
            setUsdlBalance(undefined);
        }
    }, [walletAddress, isConnected]);

    // Fetch balance when wallet connects/disconnects
    React.useEffect(() => {
        fetchUsdlBalance();
    }, [fetchUsdlBalance]);

    // Memoized handlers to prevent re-render loops
    const handleBalanceClick = React.useCallback(() => {
        setBalanceDropdownOpen(prev => !prev);
    }, []);

    const handleWalletClick = React.useCallback(() => {
        setWalletDropdownOpen(prev => !prev);
    }, []);

    const handleDisconnect = React.useCallback(() => {
        disconnect();
        setWalletDropdownOpen(false);
    }, [disconnect]);

    const handleTopUp = React.useCallback(async () => {
        setIsDripping(true);
        try {
            await dripUsdl();
            showToast('Successfully received 100 USDL!', 'success');
            await fetchUsdlBalance(); // Refresh balance
            setBalanceDropdownOpen(false);
        } catch (error: any) {
            console.error('Failed to drip USDL:', error);

            const errorMessage = error?.message?.toLowerCase() || '';
            const errorCode = error?.code;

            if (
                errorCode === 4001 ||
                errorCode === 'ACTION_REJECTED' ||
                errorMessage.includes('user rejected') ||
                errorMessage.includes('cancelled') ||
                errorMessage.includes('canceled') ||
                errorMessage.includes('declined') ||
                errorMessage.includes('denied')
            ) {
                showToast('Drip cancelled. You can try again when ready.', 'info');
            } else if (errorMessage.includes('exceeds 24h mint limit')) {
                showToast('You have reached your daily drip limit. Try again in 24 hours.', 'warning');
            } else {
                showToast('Failed to get USDL. Please try again.', 'error');
            }
        } finally {
            setIsDripping(false);
        }
    }, [fetchUsdlBalance, showToast]);

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
                setWalletDropdownOpen(false);
            }
            if (balanceRef.current && !balanceRef.current.contains(event.target as Node)) {
                setBalanceDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                {isConnected && usdlBalance !== undefined && (
                    <div ref={balanceRef} style={{ position: 'relative', marginRight: '16px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#f9fafb',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#374151',
                                transition: 'all 0.15s',
                                minWidth: 'fit-content'
                            }}
                            onClick={handleBalanceClick}
                        >
                            {(Number(usdlBalance) / USDL_MULTIPLIER).toFixed(2)} USDL
                            <Tooltip content="USDL on Base Sepolia Testnet">
                                <div style={{ marginLeft: '6px', color: '#9ca3af', display: 'flex' }}>
                                    <InfoIcon size={12} />
                                </div>
                            </Tooltip>
                        </div>
                        {balanceDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                zIndex: 50,
                                minWidth: '160px'
                            }}>
                                <button
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        borderRadius: '8px'
                                    }}
                                    onClick={handleTopUp}
                                    disabled={isDripping}
                                >
                                    <TopUpIcon size={16} />
                                    <span style={{ marginLeft: '8px' }}>{isDripping ? 'Getting USDL...' : 'Get USDL'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {isConnected ? (
                    <div ref={walletRef} style={{ position: 'relative' }}>
                        <button
                            className={styles.walletButton}
                            onClick={handleWalletClick}
                        >
                            {shortAddress}
                        </button>
                        {walletDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                zIndex: 50,
                                minWidth: '140px'
                            }}>
                                <button
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        borderRadius: '8px'
                                    }}
                                    onClick={handleDisconnect}
                                >
                                    <DisconnectIcon size={16} />
                                    <span style={{ marginLeft: '8px' }}>Disconnect</span>
                                </button>
                            </div>
                        )}
                    </div>
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
