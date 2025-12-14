'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header/Header';
import MarketFullPage from '../../components/MarketExpanded/MarketFullPage';
import { MarketData, MarketState } from '../../../data/markets';
import { fetchMarketsByStatus } from '../../../lib/onchain/reads';
import styles from '../../page.module.css';

// src/app/markets/[id]/page.tsx
// ../ -> src/app/markets
// ../../ -> src/app (Where components are)
// So ../../components is correct.
// ../../../ -> src (Where data is)
// So ../../../data/markets is correct.

export default function MarketPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [market, setMarket] = React.useState<MarketData | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const target = (id || '').toLowerCase();
                const statuses: MarketState[] = ['ACTIVE', 'RESOLVING', 'RESOLVED', 'UNDETERMINED'];
                let found: MarketData | null = null;
                for (const s of statuses) {
                    const list = await fetchMarketsByStatus(s);
                    found = list.find((m) => {
                        const cid = (m.contractId || '').toLowerCase();
                        const mid = (m.id ? String(m.id) : '').toLowerCase();
                        return cid === target || mid === target;
                    }) || null;
                    if (found) break;
                }
                if (!cancelled) setMarket(found);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (id) {
            load();
        }
        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <>
            <Header onNavigate={(page) => page === 'landing' ? router.push('/') : router.push('/markets')} currentPage="markets" />
            <main style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 16px' }}>
                <div style={{ width: '100%', maxWidth: '1360px' }}>
                    {loading ? (
                        <div className={styles.skeletonDetail}>
                            <div className={styles.shimmer}></div>
                        </div>
                    ) : market ? (
                        <MarketFullPage
                            onBack={() => router.push('/markets')}
                            market={market}
                        />
                    ) : (
                        <div>Market not found</div>
                    )}
                </div>
            </main>
        </>
    );
}
