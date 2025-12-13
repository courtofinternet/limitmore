import React from 'react';
import styles from './MarketCard.module.css';
import GeckoWidget from '../SharedMarket/GeckoWidget';
import TradingViewWidget from '../SharedMarket/TradingViewWidget';
import ProbabilityGauge from '../SharedMarket/ProbabilityGauge';
import { MarketData, getUserMarketStatus } from '../../../data/markets';
import { claimRewards } from '../../../lib/onchain/writes';
import { useWallet } from '../../providers/WalletProvider';

interface MarketCardProps {
    market: MarketData;
    onClick: () => void;
    now?: number;
    // Legacy props for backwards compatibility (will be removed)
    title?: string;
    icon?: string;
    probability?: number;
    volume?: number;
    timeLeft?: string;
    trend?: 'up' | 'down';
    type?: 'crypto' | 'stock' | 'other';
    identifier?: string;
}

const formatVolume = (num: number) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M USDC';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'k USDC';
    }
    return num.toString() + ' USDC';
};

const formatCountdown = (timeLeftMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const formatDeadlineDateTime = (deadlineSeconds: number) => {
    const date = new Date(deadlineSeconds * 1000);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatExactUsdc = (num: number) => {
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
};

const MarketCard: React.FC<MarketCardProps> = ({
    market,
    onClick,
    now,
    // Legacy props for backwards compatibility
    title: legacyTitle,
    icon = '💎',
    probability: legacyProbability,
    volume: legacyVolume,
    trend = 'up',
    type: legacyType,
    identifier: legacyIdentifier
}) => {
    // Use market data or fall back to legacy props
    const title = market?.title || legacyTitle || 'Market';
    const probability = market ? market.probYes * 100 : (legacyProbability || 50);
    const volume = market?.volume || legacyVolume || 0;
    const type = market?.type || legacyType || 'crypto';
    const identifier = market?.identifier || legacyIdentifier;

    const { isConnected, walletAddress } = useWallet();

    // Get user market status if we have market data and wallet connected
    const userStatus = market && isConnected && walletAddress ? getUserMarketStatus(market.id, walletAddress) : null;

    const hasNow = typeof now === 'number';
    const currentTimeMs = hasNow ? now : null;
    const deadlineMs = market ? market.deadline * 1000 : null;
    const deadlineText = market ? formatDeadlineDateTime(market.deadline) : null;
    const countdownText = deadlineMs && currentTimeMs ? formatCountdown(deadlineMs - currentTimeMs) : null;

    const handleClaim = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isConnected) return;
        await claimRewards(market.contractId as `0x${string}`);
    };

    const getActionArea = () => {
        if (!market) {
            // Legacy display
            return (
                <div className={styles.actions}>
                    <span className={`${styles.tag} ${styles.tagYes}`}>YES</span>
                    <span className={`${styles.tag} ${styles.tagNo}`}>NO</span>
                </div>
            );
        }

        if (market.state === 'ACTIVE') {
            return (
                <span className={styles.countdown} title={deadlineText ?? undefined}>
                    {countdownText ?? '—'}
                </span>
            );
        }

        return (
            <span className={styles.deadline} title="Deadline">
                {deadlineText ?? '—'}
            </span>
        );
    };

    const isResolving = market?.state === 'RESOLVING';
    const isFinalized = market?.state === 'RESOLVED' || market?.state === 'UNDETERMINED';

    return (
        <div className={`${styles.card} ${isResolving ? styles.cardResolving : ''} ${isFinalized ? styles.cardFinalized : ''}`} onClick={onClick}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <span className={styles.icon}>{icon}</span>
                    <h3 className={styles.title}>{title}</h3>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ProbabilityGauge probability={probability} />
                </div>
            </div>

            <div className={styles.graphContainer}>
                {market?.statsLoading ? (
                    <div className={styles.statsSkeleton}>
                        <div className={styles.skeletonBar}></div>
                    </div>
                ) : isResolving ? (
                    <div className={styles.resolvingStage}>
                        <div className={styles.resolvingBackdrop} aria-hidden="true">
                            <svg className={styles.graphLine} viewBox="0 0 100 40" preserveAspectRatio="none">
                                <path
                                    d="M0,28 C18,30 28,10 46,14 S74,34 100,10"
                                    fill="none"
                                    stroke="rgba(39, 39, 42, 0.55)"
                                    strokeWidth="2"
                                />
                                <path
                                    d="M0,35 L0,40 L100,40 L100,18 C80,22 68,34 52,28 S22,18 0,24 Z"
                                    fill="rgba(39, 39, 42, 0.12)"
                                />
                            </svg>
                        </div>
                        <div className={styles.resolvingOverlay}>
                            <div className={styles.resolvingTitle}>Resolving</div>
                            <div className={styles.resolvingMeta}>
                                <div className={styles.resolvingRow}>
                                    <span className={styles.resolvingLabel}>Deadline</span>
                                    <span className={styles.resolvingValue}>{deadlineText}</span>
                                </div>
                                <div className={styles.resolvingRow}>
                                    <span className={styles.resolvingLabel}>Source</span>
                                    <span className={styles.resolvingValue}>{market.resolutionSource}</span>
                                </div>
                                <div className={styles.resolvingRow}>
                                    <span className={styles.resolvingLabel}>Rule</span>
                                    <span className={`${styles.resolvingValue} ${styles.resolvingRule}`} title={market.resolutionRule}>
                                        {market.resolutionRule}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : isFinalized ? (
                    (() => {
                        const resolvedOutcome = market.resolvedOutcome as unknown as 'YES' | 'NO' | 'INVALID' | undefined;
                        const outcomeTone =
                            resolvedOutcome === 'YES'
                                ? 'yes'
                                : resolvedOutcome === 'NO'
                                    ? 'no'
                                    : resolvedOutcome === 'INVALID'
                                        ? 'invalid'
                                        : 'neutral';

                        const finalPrice =
                            market.deadlinePrice !== undefined
                                ? `${market.priceSymbol ?? ''}${market.deadlinePrice.toLocaleString()}`
                                : null;

                        const position = userStatus?.position;
                        const userState = !userStatus?.hasPosition
                            ? 'none'
                            : userStatus.userWon
                                ? userStatus.position?.claimed
                                    ? 'claimed'
                                    : userStatus.canClaim
                                        ? 'claimable'
                                        : 'won'
                                : 'lost';

                        const userLine =
                            userState === 'none'
                                ? 'No position'
                                : 'Your stake';

                        const userSubline =
                            userState === 'none'
                                ? 'You did not participate'
                                : userState === 'lost'
                                    ? position
                                        ? `${formatVolume(position.amount)} on ${position.outcome}`
                                        : null
                                    : userStatus
                                        ? `+${formatExactUsdc(userStatus.potentialWinnings)}`
                                        : null;

                        return (
                            <div className={styles.finalizedCenter}>
                                <div className={styles.marketOutcome}>
                                    <div className={styles.marketOutcomeLabel}>Resolved</div>
                                    <div
                                        className={`${styles.marketOutcomeValue} ${
                                            outcomeTone === 'yes'
                                                ? styles.marketOutcomeYes
                                                : outcomeTone === 'no'
                                                    ? styles.marketOutcomeNo
                                                    : outcomeTone === 'invalid'
                                                        ? styles.marketOutcomeInvalid
                                                        : styles.marketOutcomeNeutral
                                        }`}
                                    >
                                        {resolvedOutcome ?? '—'}
                                    </div>
                                </div>

                                <div className={styles.marketFacts}>
                                    <div className={styles.fact}>
                                        <span className={styles.factLabel}>Closed at</span>
                                        <span className={styles.factValue}>{finalPrice ?? '—'}</span>
                                    </div>
                                </div>

                                <div className={styles.userOutcome}>
                                    {!isConnected ? (
                                        <div className={styles.userOutcomeText}>
                                            <div className={`${styles.userOutcomeLine} ${styles.userOutcomeNeutral}`}>
                                                Your stake
                                            </div>
                                            <div className={styles.userOutcomeSubline}>
                                                Connect your wallet to start betting.
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.userOutcomeText}>
                                                <div className={`${styles.userOutcomeLine} ${styles.userOutcomeNeutral}`}>
                                                    {userLine}
                                                </div>
                                                {userSubline && (
                                                    <div
                                                        className={
                                                            userState === 'claimable' || userState === 'won' || userState === 'claimed'
                                                                ? styles.userOutcomePayout
                                                                : styles.userOutcomeSubline
                                                        }
                                                    >
                                                        {userSubline}
                                                    </div>
                                                )}
                                            </div>

                                            {userState === 'claimable' ? (
                                                <button className={`${styles.claimButton} ${styles.claimButtonShimmer}`} onClick={handleClaim}>
                                                    Claim
                                                </button>
                                            ) : userState === 'claimed' ? (
                                                <span className={`${styles.claimButton} ${styles.claimButtonClaimed}`}>
                                                    Claimed
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                ) : identifier ? (
                    type === 'crypto' ? (
                        <div style={{ height: '100%', width: '100%', pointerEvents: 'none' }}>
                            <GeckoWidget coinId={identifier} mini={true} />
                        </div>
                    ) : type === 'stock' ? (
                        <div style={{ height: '100%', width: '100%', pointerEvents: 'none' }}>
                            <TradingViewWidget symbol={identifier} />
                        </div>
                    ) : null
                ) : (
                    <svg className={styles.graphLine} viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path
                            d={
                                trend === 'up'
                                    ? 'M0,35 C20,35 40,20 60,15 S80,5 100,5'
                                    : 'M0,5 C20,10 40,20 60,30 S80,35 100,35'
                            }
                            fill="none"
                            stroke={trend === 'up' ? 'var(--success)' : 'var(--danger)'}
                            strokeWidth="2"
                        />
                    </svg>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.footerLeft}>
                    {market?.statsLoading ? (
                        <span className={styles.volumeLoading}></span>
                    ) : (
                        <span className={styles.volume}>{formatVolume(volume)}</span>
                    )}
                    {/* Only show position for active markets in footer */}
                    {userStatus?.hasPosition && market?.state === 'ACTIVE' && (
                        <span className={styles.userPosition}>
                            {formatVolume(userStatus.position!.amount)} on {userStatus.position!.outcome}
                        </span>
                    )}
                </div>
                {getActionArea()}
            </div>
        </div>
    );
};

export default MarketCard;
