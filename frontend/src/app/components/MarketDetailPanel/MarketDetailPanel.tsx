import React from 'react';
import styles from './MarketDetailPanel.module.css';
import TradeBox from '../SharedMarket/TradeBox';
import ChartSection from '../SharedMarket/ChartSection';
import { MarketData, getUserMarketStatus } from '../../../data/markets';
import { claimRewards } from '../../../lib/onchain/writes';
import { useWallet } from '../../providers/WalletProvider';
import ConnectWalletPrompt from '../Wallet/ConnectWalletPrompt';

interface MarketDetailPanelProps {
    onClose: () => void;
    onFullPage: () => void;
    market?: MarketData; // New: Full market data
    // Legacy props for backwards compatibility
    marketTitle?: string;
    probability?: number;
    type?: 'crypto' | 'stock' | 'other';
    identifier?: string;
    description?: string;
    resolutionSource?: string;
    resolutionRule?: string;
    volume?: number;
}

const formatUsdcCompact = (num: number) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M USDC';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'k USDC';
    }
    return num.toLocaleString() + ' USDC';
};

const formatUsdcAmount = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USDC';
};

const formatResolutionDate = (deadlineSeconds?: number) => {
    if (!deadlineSeconds) return null;
    const date = new Date(deadlineSeconds * 1000);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const MarketDetailPanel: React.FC<MarketDetailPanelProps> = ({
    onClose,
    onFullPage,
    market,
    // Legacy props
    marketTitle: legacyTitle = "Market Title",
    probability: legacyProbability = 50,
    type: legacyType = 'crypto',
    identifier: legacyIdentifier = 'bitcoin',
    description: legacyDescription = "",
    resolutionSource: legacyResolutionSource = "Oracle",
    resolutionRule: legacyResolutionRule = "Standard Rules",
    volume: legacyVolume = 0
}) => {
    // Use market data or fall back to legacy props
    const marketTitle = market?.title || legacyTitle;
    const probability = market ? market.probYes * 100 : legacyProbability;
    const type = market?.type || legacyType;
    const identifier = market?.identifier || legacyIdentifier;
    const description = market?.description || legacyDescription;
    const resolutionSource = market?.resolutionSource || legacyResolutionSource;
    const resolutionRule = market?.resolutionRule || legacyResolutionRule;
    const volume = market?.volume || legacyVolume;

    const { isConnected, walletAddress } = useWallet();

    // Get user status for finalized markets
    const userStatus = market && isConnected && walletAddress ? getUserMarketStatus(market.id, walletAddress) : null;

    const finalPriceText = market?.deadlinePrice
        ? `${market.priceSymbol ?? ''}${market.deadlinePrice.toLocaleString()}`
        : null;

    const handleClaim = async () => {
        if (!market || !isConnected) return;
        await claimRewards(market.contractId as `0x${string}`);
    };

    // Finalized markets: minimalist summary + position
    if (market?.state === 'RESOLVED' || market?.state === 'UNDETERMINED') {
        const outcomeYes = market.resolvedOutcome === 'YES';
        const position = userStatus?.position;
        const userWon = userStatus?.userWon ?? false;
        const potentialWinnings = userStatus?.potentialWinnings ?? 0;

        return (
            <div className={styles.panel}>
                <div className={styles.scrollContainer}>
                    <div className={styles.topBar}>
                        <button className={styles.backButton} onClick={onClose}>
                            <span>✕</span> Close
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={styles.backButton} onClick={onFullPage}>⛶ Full page</button>
                            <button className={styles.shareButton}>Share</button>
                        </div>
                    </div>

                    <div className={styles.hero}>
                        <div className={styles.heroTitleRow}>
                            <h2 className={styles.heroTitle}>{marketTitle}</h2>
                            {market.resolvedOutcome && (
                                <span className={`${styles.pill} ${outcomeYes ? styles.pillYes : styles.pillNo}`}>
                                    {market.resolvedOutcome} won
                                </span>
                            )}
                        </div>
                        <div className={styles.heroMetaRow}>
                            <span className={styles.heroMeta}>{formatUsdcCompact(volume)} volume</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeaderRow}>
                            <h3 className={styles.sectionTitleMinimal}>Your position</h3>
                        </div>

                        {!isConnected ? (
                            <ConnectWalletPrompt
                                align="left"
                                message="Connect your wallet to start betting."
                            />
                        ) : !position ? (
                            <div className={styles.emptyState}>No position in this market.</div>
                        ) : (
                            <div className={styles.positionCard}>
                                <div className={styles.positionTopRow}>
                                    <div className={styles.positionBet}>
                                        {formatUsdcAmount(position.amount)} on {position.outcome}
                                    </div>
                                    <span
                                        className={`${styles.badge} ${
                                            userWon
                                                ? position.claimed
                                                    ? styles.badgeClaimed
                                                    : styles.badgeWon
                                                : styles.badgeLost
                                        }`}
                                    >
                                        {userWon ? (position.claimed ? 'Claimed' : 'Won') : 'Lost'}
                                    </span>
                                </div>

                                <div className={`${styles.pnl} ${userWon ? styles.pnlWin : styles.pnlLoss}`}>
                                        {userWon ? `+${formatUsdcAmount(potentialWinnings)}` : `-${formatUsdcAmount(position.amount)}`}
                                </div>

                                {userWon && (
                                    <button
                                        className={`${styles.primaryButton} ${
                                            position.claimed ? styles.primaryButtonClaimed : styles.primaryButtonShimmer
                                        }`}
                                        onClick={position.claimed ? undefined : handleClaim}
                                    >
                                        {position.claimed ? 'Claimed' : `Claim ${formatUsdcAmount(potentialWinnings)}`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className={styles.truthBlock}>
                        <div className={styles.truthHeader}>Resolution</div>
                        <div className={styles.truthOutcomeRow}>
                            <div
                                className={`${styles.truthOutcome} ${
                                    outcomeYes
                                        ? styles.truthOutcomeYes
                                        : market.resolvedOutcome === 'NO'
                                            ? styles.truthOutcomeNo
                                            : styles.truthOutcomeNeutral
                                }`}
                            >
                                {market.resolvedOutcome ?? '—'}
                            </div>
                            <div className={styles.truthValue}>
                                {finalPriceText ? `Closed at ${finalPriceText}` : 'Value unavailable'}
                            </div>
                        </div>
                        <div className={styles.truthMeta}>
                            <div className={styles.truthMetaItem}>
                                <span className={styles.truthMetaLabel}>Condition</span>
                                <span className={styles.truthMetaValue}>{market.description}</span>
                            </div>
                            <div className={styles.truthMetaItem}>
                                <span className={styles.truthMetaLabel}>Source</span>
                                <span className={styles.truthMetaValue}>{resolutionSource}</span>
                            </div>
                            {market.deadline && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Resolved on</span>
                                    <span className={styles.truthMetaValue}>
                                        {formatResolutionDate(market.deadline)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.details} aria-label="Resolution and rules">
                        <div className={styles.detailsSummaryStatic}>Resolution &amp; rules</div>
                        <div className={styles.detailsBody}>
                            <p className={styles.detailsText}>{description}</p>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>Source</div>
                                    <div className={styles.detailValue}>{resolutionSource}</div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>Rule</div>
                                    <div className={styles.detailValue}>{resolutionRule}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Resolving markets: minimalist pending view
    if (market?.state === 'RESOLVING') {
        const position = userStatus?.position;

        return (
            <div className={styles.panel}>
                <div className={styles.scrollContainer}>
                    <div className={styles.topBar}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={styles.backButton} onClick={onClose}>
                                <span>✕</span> Close
                            </button>
                            <button className={styles.backButton} onClick={onFullPage}>⛶ Full page</button>
                        </div>
                        <button className={styles.shareButton}>Share</button>
                    </div>

                    <div className={styles.hero}>
                        <div className={styles.heroTitleRow}>
                            <h2 className={styles.heroTitle}>{marketTitle}</h2>
                            <span className={`${styles.pill} ${styles.pillResolving}`}>Resolving</span>
                        </div>
                        <div className={styles.heroMetaRow}>
                            <span className={styles.heroMeta}>Trading paused</span>
                            <span className={styles.heroMeta}>{formatUsdcCompact(volume)} volume</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeaderRow}>
                            <h3 className={styles.sectionTitleMinimal}>Your position</h3>
                        </div>

                        {!isConnected ? (
                            <ConnectWalletPrompt
                                align="left"
                                message="Connect your wallet to start betting."
                            />
                        ) : !position ? (
                            <div className={styles.emptyState}>No position in this market.</div>
                        ) : (
                            <div className={styles.positionCard}>
                                <div className={styles.positionTopRow}>
                                    <div className={styles.positionBet}>
                                        {formatUsdcAmount(position.amount)} on {position.outcome}
                                    </div>
                                    <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
                                </div>
                                <div className={styles.pendingNote}>
                                    Outcome pending. Winnings depend on final resolution.
                                </div>
                            </div>
                        )}
                    </div>

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
                            <div className={styles.truthMetaItem}>
                                <span className={styles.truthMetaLabel}>Source</span>
                                <span className={styles.truthMetaValue}>{resolutionSource}</span>
                            </div>
                            {market.deadline && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Expected</span>
                                    <span className={styles.truthMetaValue}>
                                        {formatResolutionDate(market.deadline)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.details} aria-label="Resolution and rules">
                        <div className={styles.detailsSummaryStatic}>Resolution &amp; rules</div>
                        <div className={styles.detailsBody}>
                            <p className={styles.detailsText}>{description}</p>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>Source</div>
                                    <div className={styles.detailValue}>{resolutionSource}</div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailLabel}>Rule</div>
                                    <div className={styles.detailValue}>{resolutionRule}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className={styles.panel}>
            <div className={styles.scrollContainer}>

                {/* Header Actions */}
                <div className={styles.topBar}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.backButton} onClick={onClose} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✕</span>
                            <span>Close</span>
                        </button>
                        {market && (
                            <button className={styles.backButton} onClick={onFullPage}>⛶ Full page</button>
                        )}
                    </div>
                    <button className={styles.shareButton}>Share</button>
                </div>

                {/* Metadata */}
                <div className={styles.metaRow}>
                    <span>Ends on Dec 15, 2025</span>
                    <span>Created by Limitless</span>
                </div>

                <h2 className={styles.title}>{marketTitle}</h2>

                {/* Progress Text */}
                <div className={styles.progressBarContainer}>
                    <div className={styles.probabilityText}>
                        <span style={{ color: '#f97316' }}>Yes {probability.toFixed(1)}%</span>
                        <span style={{ color: '#71717a' }}>No {(100 - probability).toFixed(1)}%</span>
                    </div>
                    <div className={styles.barBackground}>
                        <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
                    </div>
                </div>

                {/* Volume Stats */}
                <div className={styles.volumeRow}>
                    <span>↗ Volume {(volume / 1000).toFixed(1)}k USDC</span>
                    <span>Value 1.00 USDC ⓘ</span>
                </div>

                {/* TradeBox with market state support */}
                <TradeBox probability={probability} market={market} />

                <ChartSection probability={probability} type={type} identifier={identifier} />

                {/* Resolution Info */}
                <div className={styles.resolutionSection}>
                    <div className={styles.resTabs}>
                        <span className={`${styles.resTab} ${styles.resTabActive}`}>Resolution</span>
                    </div>

                    <p className={styles.resText}>
                        {description}
                        <br /><br />
                        Source: {resolutionSource}
                        <br />
                        {resolutionRule}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default MarketDetailPanel;
