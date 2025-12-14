import React from 'react';
import styles from './MarketFullPage.module.css';
import TradeBox from '../SharedMarket/TradeBox';
import ChartSection from '../SharedMarket/ChartSection';
import { MarketData, getUserMarketStatus } from '../../../data/markets';
import { claimRewards } from '../../../lib/onchain/writes';
import { useWallet } from '../../providers/WalletProvider';
import { useToast } from '../../providers/ToastProvider';
import ConnectWalletPrompt from '../Wallet/ConnectWalletPrompt';
import { formatVolume, formatAddress, formatResolutionDate } from '../../../utils/formatters';
import CopyIcon from '../Shared/CopyIcon';
import ResolutionRules from '../Shared/ResolutionRules';

interface MarketFullPageProps {
    onBack: () => void;
    market?: MarketData; // New: Full market data
    // Legacy props for backwards compatibility
    marketTitle?: string;
    probability?: number;
    type?: 'crypto' | 'stock' | 'other';
    identifier?: string;
    description?: string;
    resolutionRule?: string;
    volume?: number;
}


const MarketFullPage: React.FC<MarketFullPageProps> = ({
    onBack,
    market,
    // Legacy props
    marketTitle: legacyTitle = "Market Title",
    probability: legacyProbability = 50,
    type: legacyType = 'crypto',
    identifier: legacyIdentifier = 'bitcoin',
    description: legacyDescription = "",
    resolutionRule: legacyResolutionRule = "Standard Rules",
    volume: legacyVolume = 0
}) => {
    // Use market data or fall back to legacy props
    const marketTitle = market?.title || legacyTitle;
    const probability = market ? market.probYes * 100 : legacyProbability;
    const type = market?.type || legacyType;
    const identifier = market?.identifier || legacyIdentifier;
    const description = market?.description || legacyDescription;
    const resolutionRule = market?.resolutionRule || legacyResolutionRule;
    const volume = market?.volume || legacyVolume;

    const { isConnected, walletAddress } = useWallet();
    const { showToast } = useToast();

    // Get user status for finalized markets
    const userStatus = market && isConnected && walletAddress ? getUserMarketStatus(market.id, walletAddress) : null;
    const finalPriceText = market?.deadlinePrice
        ? `${market.priceSymbol ?? ''}${market.deadlinePrice.toLocaleString()}`
        : null;
    const resolutionDate = formatResolutionDate(market?.deadlineDate);
    const handleClaim = async () => {
        if (!market || !isConnected) return;
        await claimRewards(market.contractId as `0x${string}`);
    };

    // Finalized markets: focused summary + results
    if (market?.state === 'RESOLVED' || market?.state === 'UNDETERMINED') {
        return (
            <div className={styles.wrap}>
                <div className={styles.container}>
                    <div className={styles.mainContent}>
                        <div className={styles.topBar}>
                            <button className={styles.backButton} onClick={onBack}>← Back</button>
                            <button className={styles.backButton}>Share</button>
                        </div>
                        <div className={styles.stateRow}>
                            <span className={`${styles.statePill} ${styles.statePillFinalized}`}>Finalized</span>
                            <span className={styles.stateNote}>Trading closed · Outcome locked</span>
                        </div>

                        <h1 className={styles.title}>{marketTitle}</h1>

                        <div className={styles.truthBlock}>
                        <div className={styles.truthHeader}>Resolution</div>
                        <div className={styles.truthOutcomeRow}>
                            <div
                                className={`${styles.truthOutcome} ${
                                    market.resolvedOutcome === 'YES'
                                            ? styles.truthOutcomeYes
                                            : market.resolvedOutcome === 'NO'
                                                ? styles.truthOutcomeNo
                                                : styles.truthOutcomeNeutral
                                    }`}
                                >
                                    {market.resolvedOutcome ?? '—'}
                                </div>
                                <div className={styles.truthValue}>
                                    {finalPriceText ? `At ${finalPriceText}` : 'Value unavailable'}
                            </div>
                        </div>
                        <div className={styles.truthMeta}>
                            <div className={styles.truthMetaItem}>
                                <span className={styles.truthMetaLabel}>Condition</span>
                                <span className={styles.truthMetaValue}>{description}</span>
                            </div>
                            {resolutionDate && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Resolved on</span>
                                    <span className={styles.truthMetaValue}>{resolutionDate}</span>
                                </div>
                            )}
                        </div>
                        </div>

                        <div className={styles.finalizedContent}>
                            <div className={styles.finalizedLeft}>
                                {/* User Position Results */}
                                <div className={styles.userResultsSection}>
                                    <h3 className={styles.sectionTitle}>Your Result</h3>
                                    {!isConnected ? (
                                        <ConnectWalletPrompt
                                            align="left"
                                            message="Connect your wallet to start betting."
                                        />
                                    ) : !userStatus?.hasPosition ? (
                                        <div className={styles.noPositionCard}>
                                            <div className={styles.cardHeader}>No Position Taken</div>
                                            <p>You did not place a bet on this market.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.positionResultCard}>
                                            <div className={styles.betSummary}>
                                                <span className={styles.betLabel}>Your Bet:</span>
                                                <span className={styles.betDetails}>
                                                    {formatVolume(userStatus.position!.amount)} on {userStatus.position!.outcome}
                                                </span>
                                            </div>

                                            <div className={`${styles.outcomeResult} ${
                                                userStatus.userWon ? styles.resultWin : styles.resultLoss
                                            }`}>
                                                {userStatus.userWon ? (
                                                    <>
                                                        <div className={styles.winMessage}>You Won!</div>
                                                        <div className={styles.winAmount}>
                                                            +{formatVolume(userStatus.potentialWinnings)}
                                                        </div>
                                                        {userStatus.canClaim ? (
                                                            <button className={styles.claimButton} onClick={handleClaim}>
                                                                Claim Winnings
                                                            </button>
                                                        ) : (
                                                            <div className={styles.claimedStatus}>
                                                                ✓ Winnings Claimed
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={styles.lossMessage}>You Lost</div>
                                                        <div className={styles.lossAmount}>
                                                            -{formatVolume(userStatus.position!.amount)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Resolution Details */}
                                <div className={styles.resolutionSection}>
                                    {market && <ResolutionRules market={market} />}
                                </div>
                            </div>

                            <div className={styles.finalizedRight}>
                                {/* Market Statistics */}
                                <div className={styles.marketStatsSection}>
                                    <h3 className={styles.sectionTitle}>Market Results</h3>
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Total Volume</div>
                                            <div className={styles.statValue}>
                                                {formatVolume(volume)}
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Winning Side</div>
                                            <div className={styles.statValue}>
                                                {market.resolvedOutcome} ({market.resolvedOutcome === 'YES' ?
                                                    (probability).toFixed(1) : (100 - probability).toFixed(1)}%)
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Final Odds</div>
                                            <div className={styles.statValue}>
                                                {probability.toFixed(1)}% / {(100 - probability).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Resolution</div>
                                            <div className={styles.statValue}>Finalized</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Resolving markets: dedicated layout, no trading
    if (market?.state === 'RESOLVING') {
        return (
            <div className={styles.wrap}>
                <div className={styles.container}>
                    <div className={styles.mainContent}>
                        <div className={styles.topBar}>
                            <button className={styles.backButton} onClick={onBack}>← Back</button>
                            <button className={styles.backButton}>Share</button>
                        </div>

                        <div className={styles.stateRow}>
                            <span className={`${styles.statePill} ${styles.statePillResolving}`}>Resolving</span>
                            <span className={styles.stateNote}>Trading paused · Outcome pending</span>
                        </div>

                        <h1 className={styles.title}>{marketTitle}</h1>

                        <div className={styles.truthBlock}>
                            <div className={styles.truthHeader}>Resolution</div>
                            <div className={styles.truthOutcomeRow}>
                                <div className={`${styles.truthOutcome} ${styles.truthOutcomeNeutral}`}>
                                    Resolving<span className={styles.truthEllipsis}>...</span>
                                </div>
                            </div>
                        <div className={styles.truthMeta}>
                            <div className={styles.truthMetaItem}>
                                <span className={styles.truthMetaLabel}>Condition</span>
                                <span className={styles.truthMetaValue}>{description}</span>
                            </div>
                            {resolutionDate && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Expected</span>
                                    <span className={styles.truthMetaValue}>{resolutionDate}</span>
                                </div>
                            )}
                        </div>
                        </div>

                        <div className={styles.progressSection}>
                            <div className={styles.probabilityText}>
                                <span style={{ color: '#f97316' }}>{market?.sideAName ?? 'Side A'} {probability.toFixed(1)}%</span>
                                <span style={{ color: '#71717a' }}>{market?.sideBName ?? 'Side B'} {(100 - probability).toFixed(1)}%</span>
                            </div>
                            <div className={styles.barBackground}>
                                <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
                            </div>
                        </div>

                        <div className={styles.finalizedContent}>
                            <div className={styles.finalizedLeft}>
                                <div className={styles.userResultsSection}>
                                    <h3 className={styles.sectionTitle}>Your Position</h3>
                                    {!isConnected ? (
                                        <ConnectWalletPrompt
                                            align="left"
                                            message="Connect your wallet to start betting."
                                        />
                                    ) : !userStatus?.hasPosition ? (
                                        <div className={styles.noPositionCard}>
                                            <div className={styles.cardHeader}>No Position</div>
                                            <p>You did not place a bet on this market.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.positionResultCard}>
                                            <div className={styles.betSummary}>
                                                <span className={styles.betLabel}>Your Bet:</span>
                                                <span className={styles.betDetails}>
                                                    {formatVolume(userStatus.position!.amount)} on {userStatus.position!.outcome}
                                                </span>
                                            </div>
                                            <div className={styles.resolutionInfo}>
                                                <p>Outcome pending. Winnings depend on final resolution.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.finalizedRight}>
                                <div className={styles.marketStatsSection}>
                                    <h3 className={styles.sectionTitle}>Context</h3>
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Total Volume</div>
                                            <div className={styles.statValue}>{formatVolume(volume)}</div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Current Odds</div>
                                            <div className={styles.statValue}>{probability.toFixed(1)}% / {(100 - probability).toFixed(1)}%</div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <div className={styles.statLabel}>Status</div>
                                            <div className={styles.statValue}>Resolving</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.container}>

                {/* Left Column: Info & Chart */}
                <div className={styles.mainContent}>
                    <div className={styles.topBar}>
                        <button className={styles.backButton} onClick={onBack}>← Back</button>
                        <button className={styles.backButton}>Share</button>
                    </div>

                        <div className={styles.metaRow}>
                            <span>
                                Ends on {formatResolutionDate(market?.deadlineDate ?? market?.deadline) ?? '—'}
                            </span>
                            {market?.contractId && (
                                <span>
                                    {formatAddress(market.contractId)}
                                    <button
                                        className={styles.copyButton}
                                        onClick={() => {
                                            navigator.clipboard?.writeText(market.contractId);
                                            showToast('Address copied', 'success');
                                        }}
                                        aria-label="Copy contract address"
                                    >
                                        <CopyIcon />
                                    </button>
                                </span>
                            )}
                        </div>

                    <h1 className={styles.title}>{marketTitle}</h1>

                    <div className={styles.progressSection}>
                        <div className={styles.probabilityText}>
                            <span style={{ color: '#f97316' }}>{market?.sideAName ?? 'Side A'} {probability.toFixed(1)}%</span>
                            <span style={{ color: '#71717a' }}>{market?.sideBName ?? 'Side B'} {(100 - probability).toFixed(1)}%</span>
                        </div>
                        <div className={styles.barBackground}>
                            <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
                        </div>
                    </div>

                    <div className={styles.volumeRow}>
                        <span>↗ Volume {formatVolume(volume)}</span>
                    </div>

                    <ChartSection probability={probability} type={type} identifier={identifier} />

                        {market && <ResolutionRules market={market} />}
                </div>

                {/* Right Column: Trading */}
                <div className={styles.sidebar}>
                    <TradeBox probability={probability} market={market} />
                </div>

            </div>
        </div>
    );
};

export default MarketFullPage;
