import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './LandingView.module.css';
import ChartSection from '../SharedMarket/ChartSection';
import { MOCK_MARKETS } from '../../../data/markets';

const LandingView: React.FC = () => {
    const router = useRouter();
    // Default to Bitcoin (ID 1) or first market
    const [selectedMarketId, setSelectedMarketId] = React.useState<number>(1);
    const [navStartIndex, setNavStartIndex] = React.useState<number>(0);

    // Get selected market data
    const selectedMarket = MOCK_MARKETS.find(m => m.id === selectedMarketId) || MOCK_MARKETS[0];

    // Define the full list for navigation
    const allNavItems = [
        MOCK_MARKETS.find(m => m.identifier === 'NASDAQ:GOOG'),
        MOCK_MARKETS.find(m => m.identifier === 'bitcoin'),
        MOCK_MARKETS.find(m => m.identifier === 'ethereum'),
        MOCK_MARKETS.find(m => m.identifier === 'monad'),
        { id: -1, ticker: 'More Markets', identifier: 'more', type: 'other' } as any
    ].filter(Boolean) as typeof MOCK_MARKETS;

    // Derived view for the carousel (show 3 items)
    const CAROUSEL_SIZE = 3;
    // Max index is Length - SIZE. If we are at that index, we see the last set.
    const maxIndex = Math.max(0, allNavItems.length - CAROUSEL_SIZE);

    // Check boundaries
    const isAtEnd = navStartIndex >= maxIndex;

    const handleNext = () => {
        if (navStartIndex < maxIndex) {
            setNavStartIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (navStartIndex > 0) {
            setNavStartIndex(prev => prev - 1);
        }
    };

    // Helper to format price
    const displayPrice = selectedMarket.type === 'crypto' ? "$92,613.00" : "$318.11";

    return (
        <div className={styles.container}>
            {/* Focus Market Card */}
            <div className={styles.marketFocusCard}>
                <div className={styles.marketHeader}>
                    <div className={styles.marketTabs}>
                        {/* Empty left side */}
                    </div>
                    <div className={styles.marketTabs}>
                        {/* Left Chevron */}
                        <div
                            className={styles.chevronBtn}
                            onClick={handlePrev}
                            style={{
                                opacity: navStartIndex > 0 ? 1 : 0,
                                pointerEvents: navStartIndex > 0 ? 'auto' : 'none'
                            }}
                        >
                            ‹
                        </div>

                        {/* Carousel Viewport */}
                        <div className={styles.carouselViewport}>
                            <div
                                className={styles.carouselTrack}
                                style={{ transform: `translateX(-${navStartIndex * 110}px)` }} // 100px width + 10px gap
                            >
                                {allNavItems.map((market) => {
                                    if (market.identifier === 'more') {
                                        return (
                                            <div
                                                key="more"
                                                className={styles.moreMarkets}
                                                onClick={() => router.push('/markets')}
                                            >
                                                More Markets
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={market.id}
                                            className={styles.navItem}
                                            onClick={() => setSelectedMarketId(market.id)}
                                            style={{
                                                fontWeight: selectedMarketId === market.id ? '700' : '500',
                                                color: selectedMarketId === market.id ? '#000' : '#888',
                                            }}
                                        >
                                            <span className={selectedMarketId === market.id ? styles.glowDot : ''} style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: selectedMarketId === market.id ? '#22c55e' : '#e5e7eb',
                                                display: 'inline-block',
                                                flexShrink: 0
                                            }}></span>
                                            {market.ticker}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Chevron */}
                        <div
                            className={styles.chevronBtn}
                            onClick={handleNext}
                            style={{
                                opacity: !isAtEnd ? 1 : 0.3,
                                pointerEvents: !isAtEnd ? 'auto' : 'none'
                            }}
                        >
                            ›
                        </div>
                    </div>
                </div>

                <h3 className={styles.marketTitle}>
                    <div style={{
                        width: '40px', height: '40px', background: '#f59e0b', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', flexShrink: 0
                    }}>
                        {selectedMarket.type === 'crypto' ? '₿' : 'G'}
                    </div>
                    <span>{selectedMarket.title}</span>
                </h3>

                <div className={styles.priceDisplay}>
                    <div>
                        <div className={styles.currentPrice}>
                            {selectedMarket.id === 1 ? "$92,613.00" : selectedMarket.id === 5 ? "$318.11" : "$124.50"}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>BASELINE PRICE</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '700' }}>51 mins 55 secs</div>
                        <div className={styles.timeRemaining}>CLOSES IN</div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    {/* Added Key to force re-mounting when identifier changes for accurate chart update */}
                    <ChartSection
                        key={selectedMarket.identifier}
                        type={selectedMarket.type}
                        identifier={selectedMarket.identifier}
                        probability={selectedMarket.probYes * 100}
                    />
                </div>

                <div className={styles.timeRangeTabs}>
                    <div className={`${styles.trTab} ${styles.trActive}`}>1H</div>
                    <div className={styles.trTab}>6H</div>
                    <div className={styles.trTab}>1D</div>
                    <div className={styles.trTab}>1W</div>
                </div>

                <div className={styles.actionButtons}>
                    <button className={`${styles.actionBtn} ${styles.btnAbove}`}>
                        ABOVE ↑ {(selectedMarket.probYes * 100).toFixed(1)}%
                    </button>
                    <button className={`${styles.actionBtn} ${styles.btnBelow}`} style={{ background: '#ea580c' }}>
                        BELOW ↓ {(selectedMarket.probNo * 100).toFixed(1)}%
                    </button>
                </div>

                <div className={styles.sentiment}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                        <span>Community Sentiment</span>
                    </div>
                    <div className={styles.sentimentBar}>
                        <div style={{ width: `${selectedMarket.probYes * 100}%`, background: '#22c55e' }}></div>
                        <div style={{ width: `${selectedMarket.probNo * 100}%`, background: '#ea580c' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '4px', color: '#777' }}>
                        <span>{(selectedMarket.probYes * 100).toFixed(1)}% Will go Up</span>
                        <span>{(selectedMarket.probNo * 100).toFixed(1)}% Will go Down</span>
                    </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Resolution Rules</h4>
                    <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                        {selectedMarket.description}
                        <br />
                        Source: {selectedMarket.resolutionSource}.
                        <br />
                        <span style={{ color: '#999', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Rules: {selectedMarket.resolutionRule}
                        </span>
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                        Resolution is decentralised
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingView;
