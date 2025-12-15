import React, { useState } from 'react';
import styles from './TradeBox.module.css';
import { MarketData, getUserMarketStatus } from '../../../data/markets';
import { claimRewards, placeBet } from '../../../lib/onchain/writes';
import { useWallet } from '../../providers/WalletProvider';
import { useToast } from '../../providers/ToastProvider';
import ConnectWalletPrompt from '../Wallet/ConnectWalletPrompt';
import { readContract } from 'wagmi/actions';
import { erc20Abi } from 'viem';
import { wagmiConfig } from '../../../lib/onchain/wagmiConfig';
import { baseSepolia } from 'wagmi/chains';

// Base Sepolia USDC contract address
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

interface TradeBoxProps {
    probability: number;
    market?: MarketData; // New: Full market data for state-aware display
    // Legacy support for existing usage
}

const TradeBox: React.FC<TradeBoxProps> = ({ probability, market }) => {
    const [amount, setAmount] = useState<string>('');
    const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');
    const [usdcBalance, setUsdcBalance] = React.useState<bigint | undefined>(undefined);

    const { isConnected, walletAddress, connect, isConnecting } = useWallet();
    const { showToast } = useToast();

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

    // Get user market status only when connected
    const userStatus = market && isConnected && walletAddress ? getUserMarketStatus(market.id, walletAddress) : null;

    const handleClaim = async () => {
        if (!market) return;
        try {
            await claimRewards(market.contractId as `0x${string}`);
            showToast('Rewards claimed successfully!', 'success');
            // Refresh balance after successful claim
            fetchUsdcBalance();
        } catch (error) {
            console.error('Failed to claim rewards:', error);
            showToast('Failed to claim rewards. Please try again.', 'error');
        }
    };

    const numericAmount = parseFloat(amount) || 0;
    const outcomePrice = selectedOutcome === 'YES' ? probability / 100 : (100 - probability) / 100;
    const potentialPayout = numericAmount > 0 ? (numericAmount / outcomePrice).toFixed(2) : '0';

    // Handle different market states
    if (market) {
        // FINALIZED MARKET: Show results and claim interface
        if (market.state === 'RESOLVED' || market.state === 'UNDETERMINED') {
            if (!isConnected) {
                return (
                    <div className={styles.tradeBox}>
                        <div className={styles.subtleHeader}>
                            <span className={styles.marketStatus}>Market Resolved</span>
                            <span className={`${styles.outcomeTag} ${market.resolvedOutcome === 'YES' ? styles.outcomeYes : styles.outcomeNo}`}>
                                {market.resolvedOutcome} Won
                            </span>
                        </div>
                        <ConnectWalletPrompt
                            align="left"
                            message="Connect your wallet to start betting."
                        />
                    </div>
                );
            }
            return (
                <div className={styles.tradeBox}>
                    <div className={styles.subtleHeader}>
                        <span className={styles.marketStatus}>Market Resolved</span>
                        <span className={`${styles.outcomeTag} ${market.resolvedOutcome === 'YES' ? styles.outcomeYes : styles.outcomeNo}`}>
                            {market.resolvedOutcome} Won
                        </span>
                    </div>

                    {userStatus?.hasPosition ? (
                        <div className={styles.positionSummary}>
                            <div className={styles.positionRow}>
                                <span>Your bet:</span>
                                <span>{userStatus.position!.amount} USDC on {userStatus.position!.outcome}</span>
                            </div>
                            {userStatus.userWon ? (
                                <div className={styles.positionRow}>
                                    <span>You won:</span>
                                    <span className={styles.winAmount}>+{userStatus.potentialWinnings.toFixed(0)} USDC</span>
                                </div>
                            ) : (
                                <div className={styles.positionRow}>
                                    <span className={styles.lossText}>You lost your bet</span>
                                </div>
                            )}
                            {userStatus.canClaim && (
                                <button className={styles.claimButton} onClick={handleClaim}>
                                    Claim {userStatus.potentialWinnings.toFixed(0)} USDC
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.noPosition}>
                            <p>You did not bet on this market.</p>
                        </div>
                    )}
                </div>
            );
        }

        // RESOLVING MARKET: Show resolving status
        if (market.state === 'RESOLVING') {
            if (!isConnected) {
                return (
                    <div className={styles.tradeBox}>
                        <div className={styles.subtleHeader}>
                            <span className={styles.marketStatus}>Resolving...</span>
                            <div className={styles.loadingDot}></div>
                        </div>
                        <ConnectWalletPrompt
                            align="left"
                            message="Connect your wallet to start betting."
                        />
                    </div>
                );
            }
            return (
                <div className={styles.tradeBox}>
                    <div className={styles.subtleHeader}>
                        <span className={styles.marketStatus}>Resolving...</span>
                        <div className={styles.loadingDot}></div>
                    </div>

                    {userStatus?.hasPosition && (
                        <div className={styles.positionSummary}>
                            <div className={styles.positionRow}>
                                <span>Your bet:</span>
                                <span>{userStatus.position!.amount} USDC on {userStatus.position!.outcome}</span>
                            </div>
                            <p className={styles.waitingText}>Waiting for resolution...</p>
                        </div>
                    )}
                </div>
            );
        }

        // No resolvable state - removed

        // ACTIVE MARKET: Show user position if they have one, then trading interface
        if (userStatus?.hasPosition) {
            return (
                <div className={styles.tradeBox}>
                    <div className={styles.positionSummary}>
                        <div className={styles.positionRow}>
                            <span>Current bet:</span>
                            <span>{userStatus.position!.amount} USDC on {userStatus.position!.outcome}</span>
                        </div>
                    </div>

                    <div className={styles.divider}></div>
                    {renderTradingInterface()}
                </div>
            );
        }
    }

    // DEFAULT: Regular trading interface (for active markets without position or legacy usage)
    if (!isConnected) {
        return (
            <div className={styles.tradeBox}>
                <ConnectWalletPrompt
                    align="left"
                    message="Connect your wallet to start betting."
                />
            </div>
        );
    }

    return (
        <div className={styles.tradeBox}>
            {renderTradingInterface()}
        </div>
    );

    function renderTradingInterface() {
        return (
            <>
                <div className={styles.inputGroup}>
                    <div className={styles.inputLabel}>
                        <span>❶</span> Enter amount
                        <span className={styles.pctOptions}>
                            <span onClick={() => setAmount('10')}>10$</span>
                            <span onClick={() => setAmount('20')}>20$</span>
                            <span onClick={() => setAmount('50')}>50$</span>
                            {usdcBalance !== undefined && (
                                <span onClick={() => setAmount((Number(usdcBalance) / 1e6).toFixed(2))}>Max</span>
                            )}
                        </span>
                    </div>
                    <div className={styles.amountInputContainer}>
                        <input
                            type="number"
                            className={styles.amountInput}
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <span className={styles.usdcSuffix}>USDC</span>
                    </div>
                    {usdcBalance !== undefined && (
                        <div style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            marginTop: '4px',
                            textAlign: 'right'
                        }}>
                            Balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                        </div>
                    )}
                    <div className={styles.slippage}>
                        <span>Min. bet: 1.00 USDC</span>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <div className={styles.inputLabel}>
                        <span>❷</span> Select outcome
                    </div>
                    <div className={styles.outcomeSelect}>
                        <button
                            className={`${styles.outcomeCard} ${styles.outcomeCardGreen} ${selectedOutcome === 'YES' ? styles.selectedOutcome : styles.unselectedOutcome}`}
                            onClick={() => setSelectedOutcome('YES')}
                        >
                            <div>
                                <div>{market?.sideAName ?? 'YES'} {probability.toFixed(1)}%</div>
                                <div className={styles.outcomeSubtext}>To Win {selectedOutcome === 'YES' ? potentialPayout : '0'} USDC</div>
                            </div>
                            {selectedOutcome === 'YES' && <span>Do it</span>}
                        </button>
                        <button
                            className={`${styles.outcomeCard} ${styles.outcomeCardOrange} ${selectedOutcome === 'NO' ? styles.selectedOutcome : styles.unselectedOutcome}`}
                            onClick={() => setSelectedOutcome('NO')}
                        >
                            <div>
                                <div>{market?.sideBName ?? 'NO'} {(100 - probability).toFixed(1)}%</div>
                                <div className={styles.outcomeSubtext}>To Win {selectedOutcome === 'NO' ? potentialPayout : '0'} USDC</div>
                            </div>
                            {selectedOutcome === 'NO' && <span>Do it</span>}
                        </button>
                    </div>
                </div>

                <button
                    className={styles.payoutButton}
                    onClick={async () => {
                        if (!market) return;
                        if (!isConnected) {
                            try {
                                await connect();
                            } catch (error) {
                                console.error('Failed to connect wallet:', error);
                                showToast('Failed to connect wallet. Please try again.', 'error');
                            }
                            return;
                        }
                        try {
                            await placeBet(market.contractId as `0x${string}`, selectedOutcome, numericAmount > 0 ? numericAmount : 0);
                            showToast('Bet placed successfully!', 'success');
                            // Refresh balance after successful bet
                            fetchUsdcBalance();
                        } catch (error) {
                            console.error('Failed to place bet:', error);
                            showToast('Failed to place bet. Please try again.', 'error');
                        }
                    }}
                >
                    {isConnecting
                        ? 'Connecting...'
                        : `Buy ${selectedOutcome === 'YES' ? (market?.sideAName ?? 'YES') : (market?.sideBName ?? 'NO')} for ${numericAmount > 0 ? numericAmount : '0'} USDC`}
                </button>
            </>
        );
    }

};

export default TradeBox;
