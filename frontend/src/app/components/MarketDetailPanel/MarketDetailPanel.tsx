import React from 'react';
import styles from './MarketDetailPanel.module.css';
import TradeBox from '../SharedMarket/TradeBox';
import ChartSection from '../SharedMarket/ChartSection';
import { MarketData, getUserMarketStatus } from '../../../data/markets';
import { claimRewards } from '../../../lib/onchain/writes';
import { useWallet } from '../../providers/WalletProvider';
import ConnectWalletPrompt from '../Wallet/ConnectWalletPrompt';
import { useToast } from '../../providers/ToastProvider';
import { formatUsdcCompact, formatUsdcAmount, formatAddress, formatResolutionDate, formatVolume } from '../../../utils/formatters';
import CopyIcon from '../Shared/CopyIcon';
import ResolutionRules from '../Shared/ResolutionRules';

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
    volume?: number;
}


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
    volume: legacyVolume = 0
}) => {
    const { showToast } = useToast();
    const panelRef = React.useRef<HTMLDivElement>(null);
    // Use market data or fall back to legacy props
    const marketTitle = market?.title || legacyTitle;
    const probability = market ? market.probYes * 100 : legacyProbability;
    const type = market?.type || legacyType;
    const identifier = market?.identifier || legacyIdentifier;
    const description = market?.description || legacyDescription;
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


    // Close panel when clicking outside (but not on navigation elements)
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Don't close if clicking inside the panel
            if (panelRef.current && panelRef.current.contains(target)) {
                return;
            }

            // Don't close if clicking on navigation elements
            const isNavigationClick = target.closest('.stateFilter') ||
                                    target.closest('[class*="stateFilter"]') ||
                                    target.closest('[class*="CategoryFilter"]') ||
                                    target.closest('[class*="categoryFilter"]') ||
                                    target.classList.contains('stateFilter') ||
                                    target.dataset.role === 'navigation' ||
                                    // Check for common navigation class patterns
                                    Array.from(target.classList).some(cls =>
                                        cls.includes('filter') ||
                                        cls.includes('nav') ||
                                        cls.includes('tab') ||
                                        cls.includes('category') ||
                                        cls.includes('state')
                                    );

            if (!isNavigationClick) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Finalized markets: minimalist summary + position
    if (market?.state === 'RESOLVED' || market?.state === 'UNDETERMINED') {
        const isUndetermined = market?.state === 'UNDETERMINED';
        const outcomeYes = !isUndetermined && market.resolvedOutcome === 'YES';
        const position = userStatus?.position;
        const userWon = userStatus?.userWon ?? false;
        const potentialWinnings = userStatus?.potentialWinnings ?? 0;

        return (
            <div className={styles.panel} ref={panelRef}>
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

                    {/* Metadata for resolved markets */}
                    <div className={styles.metaRow}>
                        <span>
                            Ended at {formatResolutionDate(market.deadlineDate ?? market.deadline) ?? '—'}
                        </span>
                        {market.contractId && (
                            <span className={styles.contractBadge}>
                                <span className={styles.addressText}>{formatAddress(market.contractId)}</span>
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

                    <div className={styles.hero}>
                        <div className={styles.heroTitleRow}>
                            <h2 className={styles.heroTitle}>{marketTitle}</h2>
                            {isUndetermined ? (
                                <span className={`${styles.pill} ${styles.pillNeutral}`}>
                                    Undetermined
                                </span>
                            ) : market.resolvedOutcome && (
                                <span className={`${styles.pill} ${outcomeYes ? styles.pillYes : styles.pillNo}`}>
                                    {market.resolvedOutcome} won
                                </span>
                            )}
                        </div>
                        <div className={styles.heroMetaRow}>
                            <span className={styles.heroMeta}>Market resolved</span>
                            <span className={styles.heroMeta}>{formatUsdcCompact(volume)} volume</span>
                        </div>
                    </div>

                    {/* Progress Bar for resolved markets */}
                    <div className={styles.progressBarContainer}>
                        <div className={styles.probabilityText}>
                            <span style={{ color: '#f97316' }}>{probability.toFixed(1)}%</span>
                            <span style={{ color: '#71717a' }}>{(100 - probability).toFixed(1)}%</span>
                        </div>
                        <div className={styles.barBackground}>
                            <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
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
                            {(market.deadlineDate || market.deadline) && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Resolved on</span>
                                    <span className={styles.truthMetaValue}>
                                        {formatResolutionDate(market.deadlineDate ?? market.deadline)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                        <ResolutionRules market={market} variant="compact" />
                </div>
            </div>
        );
    }

    // Resolving markets: minimalist pending view
    if (market?.state === 'RESOLVING') {
        const position = userStatus?.position;

        return (
            <div className={styles.panel} ref={panelRef}>
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

                    {/* Metadata for resolving markets */}
                    <div className={styles.metaRow}>
                        <span>
                            Ends on {formatResolutionDate(market.deadlineDate ?? market.deadline) ?? '—'}
                        </span>
                        {market.contractId && (
                            <span className={styles.contractBadge}>
                                <span className={styles.addressText}>{formatAddress(market.contractId)}</span>
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

                    {/* Progress Bar for resolving markets */}
                    <div className={styles.progressBarContainer}>
                        <div className={styles.probabilityText}>
                            <span style={{ color: '#f97316' }}>{probability.toFixed(1)}%</span>
                            <span style={{ color: '#71717a' }}>{(100 - probability).toFixed(1)}%</span>
                        </div>
                        <div className={styles.barBackground}>
                            <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
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
                            {(market.deadlineDate || market.deadline) && (
                                <div className={styles.truthMetaItem}>
                                    <span className={styles.truthMetaLabel}>Expected</span>
                                    <span className={styles.truthMetaValue}>
                                        {formatResolutionDate(market.deadlineDate ?? market.deadline)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                        <ResolutionRules market={market} variant="compact" />
                </div>
            </div>
        );
    }
    return (
        <div className={styles.panel} ref={panelRef}>
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
                    <span>
                        Ends on {formatResolutionDate(market?.deadlineDate ?? market?.deadline) ?? '—'}
                    </span>
                    {market?.contractId && (
                        <span className={styles.contractBadge}>
                            <span className={styles.addressText}>{formatAddress(market.contractId)}</span>
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

                <h2 className={styles.title}>{marketTitle}</h2>

                {/* Progress Text */}
                <div className={styles.progressBarContainer}>
                    <div className={styles.probabilityText}>
                        <span style={{ color: '#f97316' }}>{probability.toFixed(1)}%</span>
                        <span style={{ color: '#71717a' }}>{(100 - probability).toFixed(1)}%</span>
                    </div>
                    <div className={styles.barBackground}>
                        <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
                    </div>
                </div>

                {/* Volume Stats */}
                <div className={styles.volumeRow}>
                    <span>↗ Volume {formatVolume(volume)}</span>
                    <span>Min bet 1.00 USDC</span>
                </div>

                {/* TradeBox with market state support */}
                <TradeBox probability={probability} market={market} />

                <ChartSection probability={probability} type={type} identifier={identifier} />

                {/* Resolution Info */}
                {market && <ResolutionRules market={market} />}

            </div>
        </div>
    );
};

export default MarketDetailPanel;
