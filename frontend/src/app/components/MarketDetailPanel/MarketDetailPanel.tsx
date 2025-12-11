import React from 'react';
import styles from './MarketDetailPanel.module.css';
import TradeBox from '../SharedMarket/TradeBox';
import ChartSection from '../SharedMarket/ChartSection';

interface MarketDetailPanelProps {
    onClose: () => void;
    onFullPage: () => void;
    marketTitle?: string;
    probability?: number;
    type?: 'crypto' | 'stock' | 'other';
    identifier?: string;
    description?: string;
    resolutionSource?: string;
    resolutionRule?: string;
    volume?: number;
}

const MarketDetailPanel: React.FC<MarketDetailPanelProps> = ({
    onClose,
    onFullPage,
    marketTitle = "Market Title",
    probability = 50,
    type = 'crypto',
    identifier = 'bitcoin',
    description = "",
    resolutionSource = "Oracle",
    resolutionRule = "Standard Rules",
    volume = 0
}) => {
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
                        <button className={styles.backButton} onClick={onFullPage}>⛶ Full page</button>
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

                {/* Reusing TradeBox */}
                <TradeBox probability={probability} />

                {/* Reusing ChartSection with generic props */}
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
