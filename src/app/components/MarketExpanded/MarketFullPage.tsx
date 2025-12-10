import React from 'react';
import styles from './MarketFullPage.module.css';
import TradeBox from '../SharedMarket/TradeBox';
import ChartSection from '../SharedMarket/ChartSection';

interface MarketFullPageProps {
    onBack: () => void;
    marketTitle?: string;
    probability?: number;
    type?: 'crypto' | 'stock' | 'other';
    identifier?: string;
    description?: string;
    resolutionRule?: string;
    resolutionSource?: string;
    volume?: number;
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

const MarketFullPage: React.FC<MarketFullPageProps> = ({
    onBack,
    marketTitle = "Market Title",
    probability = 50,
    type = 'crypto',
    identifier = 'bitcoin',
    description = "",
    resolutionRule = "Standard Rules",
    resolutionSource = "Oracle",
    volume = 0
}) => {
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
                        <span>Ends on Dec 15, 2025</span>
                        <span>Created by Limitless</span>
                    </div>

                    <h1 className={styles.title}>{marketTitle}</h1>

                    <div className={styles.progressSection}>
                        <div className={styles.probabilityText}>
                            <span style={{ color: '#f97316' }}>Yes {probability.toFixed(1)}%</span>
                            <span style={{ color: '#71717a' }}>No {(100 - probability).toFixed(1)}%</span>
                        </div>
                        <div className={styles.barBackground}>
                            <div className={styles.barFill} style={{ width: `${probability}%` }}></div>
                        </div>
                    </div>

                    <div className={styles.volumeRow}>
                        <span>↗ Volume {formatVolume(volume)}</span>
                        <span>Value 1.00 USDC ⓘ</span>
                    </div>

                    <ChartSection probability={probability} type={type} identifier={identifier} />

                    <div className={styles.resolutionSection}>
                        <div className={styles.resTabs}>
                            <div className={`${styles.resTab} ${styles.resTabActive}`}>Resolution</div>

                        </div>
                        <div className={styles.resText}>
                            <p>Resolution is centralized and made by the Limitless team.</p>
                            <br />
                            <p>
                                {description}
                                <br />
                                Source: {resolutionSource}
                                <br />
                                {resolutionRule}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Trading */}
                <div className={styles.sidebar}>
                    <TradeBox probability={probability} />
                </div>

            </div>
        </div>
    );
};

export default MarketFullPage;
