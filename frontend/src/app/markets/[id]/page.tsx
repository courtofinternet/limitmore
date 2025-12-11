'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header/Header';
import MarketFullPage from '../../components/MarketExpanded/MarketFullPage';
import { MOCK_MARKETS } from '../../../data/markets';

// src/app/markets/[id]/page.tsx
// ../ -> src/app/markets
// ../../ -> src/app (Where components are)
// So ../../components is correct.
// ../../../ -> src (Where data is)
// So ../../../data/markets is correct.

export default function MarketPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const market = MOCK_MARKETS.find(m => m.id === id);

    if (!market) {
        return <div>Market not found</div>;
    }

    return (
        <>
            <Header onNavigate={(page) => page === 'landing' ? router.push('/') : router.push('/markets')} currentPage="markets" />
            <MarketFullPage
                onBack={() => router.push('/markets')}
                marketTitle={market.title}
                probability={market.probYes * 100}
                type={market.type}
                identifier={market.identifier}
                description={market.description}
                resolutionRule={market.resolutionRule}
                resolutionSource={market.resolutionSource}
                volume={market.volume}
            />
        </>
    );
}
