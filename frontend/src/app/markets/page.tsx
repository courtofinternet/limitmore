'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import CategoryFilter from '../components/CategoryFilter/CategoryFilter';
import MarketCard from '../components/MarketCard/MarketCard';
import MarketDetailPanel from '../components/MarketDetailPanel/MarketDetailPanel';
import styles from '../page.module.css';
import { MarketState, MarketData } from '../../data/markets';
import { fetchMarketsByStatus } from '../../lib/onchain/reads';

export default function MarketsPage() {
    const router = useRouter();
    const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState('All'); // UI category, not used for fetching
    const [activeMarketState, setActiveMarketState] = useState<MarketState>('ACTIVE');
    const [now, setNow] = useState(() => Date.now());
    const [marketsByState, setMarketsByState] = useState<Record<MarketState, MarketData[]>>({
        ACTIVE: [],
        RESOLVING: [],
        RESOLVED: [],
        UNDETERMINED: []
    });
    const [loadingStates, setLoadingStates] = useState<Record<MarketState, boolean>>({
        ACTIVE: false,
        RESOLVING: false,
        RESOLVED: false,
        UNDETERMINED: false
    });

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const handleMarketClick = (id: number) => {
        setSelectedMarketId(id);
    };

    const loadState = async (state: MarketState) => {
        setLoadingStates((prev) => ({ ...prev, [state]: true }));
        try {
            const markets = await fetchMarketsByStatus(state);
            setMarketsByState((prev) => ({ ...prev, [state]: markets }));
        } finally {
            setLoadingStates((prev) => ({ ...prev, [state]: false }));
        }
    };

    // Load needed state data when state changes (initially and on switch)
    useEffect(() => {
        if (!marketsByState[activeMarketState]?.length && !loadingStates[activeMarketState]) {
            loadState(activeMarketState);
        }
    }, [activeMarketState, marketsByState, loadingStates]);

    // Determine current markets based on category selection
    const currentMarkets: MarketData[] = marketsByState[activeMarketState] || [];

    const selectedMarket = currentMarkets.find(m => m.id === selectedMarketId);

    const filteredMarkets = currentMarkets.filter(market => {
        // Map UI category labels to contract enums
        const matchesCategory =
            activeCategory === 'All' ||
            (activeCategory === 'Crypto' && market.category === 'CRYPTO') ||
            (activeCategory === 'Economy' && market.category === 'STOCKS') ||
            (activeCategory === 'Company News' && market.category === 'STOCKS');
        return matchesCategory;
    });

    const isGridLoading = loadingStates[activeMarketState] && !(marketsByState[activeMarketState]?.length);

    return (
        <>
            <Header onNavigate={(page) => page === 'landing' ? router.push('/') : null} currentPage="markets" />

            <div className={styles.mainContainer}>
                <div className={styles.contentArea}>

                    <div className={styles.stickyHeader}>
                        <CategoryFilter
                            active={activeCategory}
                            onSelect={setActiveCategory}
                        />
                    </div>

                    <div className={styles.scrollContent}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                {activeMarketState} Markets
                            </h2>
                            <div className={styles.stateFilters}>
                                {(['ACTIVE', 'RESOLVING', 'RESOLVED', 'UNDETERMINED'] as MarketState[]).map((state) => (
                                    <button
                                        key={state}
                                        className={`${styles.stateFilter} ${
                                            activeMarketState === state ? styles.stateFilterActive : ''
                                        }`}
                                        onClick={() => setActiveMarketState(state)}
                                    >
                                        {state === 'ACTIVE'
                                            ? 'Active'
                                            : state === 'RESOLVING'
                                                ? 'Resolving'
                                                : state === 'RESOLVED'
                                                    ? 'Finalized'
                                                    : 'Undetermined'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.grid}>
                            {isGridLoading
                                ? Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className={styles.skeletonGridItem}>
                                        <div className={styles.shimmer}></div>
                                    </div>
                                ))
                                : filteredMarkets.map((market) => (
                                    <MarketCard
                                        key={market.id}
                                        market={market}
                                        now={now}
                                        onClick={() => handleMarketClick(market.id)}
                                    />
                                ))}
                        </div>
                    </div>

                </div>

                {selectedMarketId && (
                    <div className={styles.sidePanelContainer}>
                        {isGridLoading ? (
                            <div className={styles.skeletonDetail}>
                                <div className={styles.shimmer}></div>
                            </div>
                        ) : (
                            <MarketDetailPanel
                                onClose={() => setSelectedMarketId(null)}
                                onFullPage={() => selectedMarketId && router.push(`/markets/${selectedMarketId}`)}
                                market={selectedMarket}
                            />
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
