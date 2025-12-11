import React from 'react';
import styles from './MarketCard.module.css';
import GeckoWidget from '../SharedMarket/GeckoWidget';
import TradingViewWidget from '../SharedMarket/TradingViewWidget';
import ProbabilityGauge from '../SharedMarket/ProbabilityGauge';

interface MarketCardProps {
    title: string;
    icon?: string;
    probability: number;
    volume: number;
    timeLeft?: string;
    onClick: () => void;
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

const MarketCard: React.FC<MarketCardProps> = ({
    title,
    icon = '💎',
    probability,
    volume,
    timeLeft,
    onClick,
    trend = 'up',
    type = 'crypto',
    identifier
}) => {
    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <span className={styles.icon}>{icon}</span>
                    <h3 className={styles.title}>{title}</h3>
                </div>
                {/* Gauge Component */}
                <div style={{ flexShrink: 0 }}>
                    <ProbabilityGauge probability={probability} />
                </div>
            </div>

            <div className={styles.graphContainer}>
                {/* Render Widget if identifier exists, else fallback loop/SVG */}
                {identifier ? (
                    type === 'crypto' ? (
                        <div style={{ height: '100%', width: '100%', pointerEvents: 'none' }}>
                            {/* pointerEvents none to prevent chart interaction stealing click from card */}
                            <GeckoWidget coinId={identifier} mini={true} />
                        </div>
                    ) : type === 'stock' ? (
                        <div style={{ height: '100%', width: '100%', pointerEvents: 'none' }}>
                            <TradingViewWidget symbol={identifier} />
                        </div>
                    ) : null
                ) : (
                    /* Fallback Simplified SVG Graph if no identifier */
                    <svg className={styles.graphLine} viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path
                            d={trend === 'up' ? "M0,35 C20,35 40,20 60,15 S80,5 100,5" : "M0,5 C20,10 40,20 60,30 S80,35 100,35"}
                            fill="none"
                            stroke={trend === 'up' ? "var(--success)" : "var(--danger)"}
                            strokeWidth="2"
                        />
                    </svg>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.volume}>
                    {/* Placeholder for volume icon */}
                    <span>{formatVolume(volume)}</span>
                </div>
                <div className={styles.actions}>
                    <span className={`${styles.tag} ${styles.tagYes}`}>YES</span>
                    <span className={`${styles.tag} ${styles.tagNo}`}>NO</span>
                </div>
            </div>
        </div>
    );
};

export default MarketCard;
