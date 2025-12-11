'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header/Header';
import CategoryFilter from '../components/CategoryFilter/CategoryFilter';
import MarketCard from '../components/MarketCard/MarketCard';
import MarketDetailPanel from '../components/MarketDetailPanel/MarketDetailPanel';
import styles from '../page.module.css';
import { MOCK_MARKETS } from '../../data/markets';

export default function MarketsPage() {
    const router = useRouter();
    const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState('All');

    const handleMarketClick = (id: number) => {
        setSelectedMarketId(id);
    };

    const selectedMarket = MOCK_MARKETS.find(m => m.id === selectedMarketId);

    const filteredMarkets = activeCategory === 'All'
        ? MOCK_MARKETS
        : MOCK_MARKETS.filter(m => m.category === activeCategory || (activeCategory === 'Company News' && m.category === 'Economy'));

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
                            <h2 className={styles.sectionTitle}>{activeCategory === 'All' ? 'Trending Markets' : activeCategory}</h2>
                            <div className={styles.sortOptions}>
                                <span>Trending</span>
                                <span>Ending Soon</span>
                                <span>High Value</span>
                                <span>Newest</span>
                            </div>
                        </div>

                        <div className={styles.grid}>
                            {filteredMarkets.map((market) => (
                                <MarketCard
                                    key={market.id}
                                    title={market.title}
                                    probability={market.probYes * 100}
                                    volume={market.volume}
                                    trend={market.percentChange >= 0 ? 'up' : 'down'}
                                    type={market.type}
                                    identifier={market.identifier}
                                    onClick={() => handleMarketClick(market.id)}
                                />
                            ))}
                        </div>
                    </div>

                </div>

                {selectedMarketId && (
                    <div className={styles.sidePanelContainer}>
                        <MarketDetailPanel
                            onClose={() => setSelectedMarketId(null)}
                            onFullPage={() => router.push(`/markets/${selectedMarketId}`)}
                            marketTitle={selectedMarket?.title}
                            probability={selectedMarket ? selectedMarket.probYes * 100 : 50}
                            type={selectedMarket?.type}
                            identifier={selectedMarket?.identifier}
                            description={selectedMarket?.description}
                            resolutionSource={selectedMarket?.resolutionSource}
                            resolutionRule={selectedMarket?.resolutionRule}
                            volume={selectedMarket?.volume}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
