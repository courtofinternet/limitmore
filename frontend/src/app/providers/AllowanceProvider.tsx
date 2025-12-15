'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWallet } from './WalletProvider';
import { checkUsdcAllowance } from '../../lib/onchain/writes';
import { FACTORY_ADDRESS } from '../../lib/constants';

interface AllowanceContextType {
    usdcAllowance: bigint | undefined;
    isLoading: boolean;
    refetchAllowance: () => Promise<void>;
    needsApproval: boolean;
}

const AllowanceContext = createContext<AllowanceContextType>({
    usdcAllowance: undefined,
    isLoading: false,
    refetchAllowance: async () => {},
    needsApproval: true
});

export const useAllowance = () => {
    const context = useContext(AllowanceContext);
    if (!context) {
        throw new Error('useAllowance must be used within AllowanceProvider');
    }
    return context;
};

interface AllowanceProviderProps {
    children: React.ReactNode;
}

export const AllowanceProvider: React.FC<AllowanceProviderProps> = ({ children }) => {
    const { isConnected, walletAddress } = useWallet();
    const [usdcAllowance, setUsdcAllowance] = useState<bigint | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAllowance = useCallback(async () => {
        if (!isConnected || !walletAddress) {
            setUsdcAllowance(undefined);
            return;
        }

        setIsLoading(true);
        try {
            const allowance = await checkUsdcAllowance(
                walletAddress as `0x${string}`,
                FACTORY_ADDRESS as `0x${string}`
            );
            setUsdcAllowance(allowance);
        } catch (error) {
            console.error('Failed to fetch USDC allowance:', error);
            setUsdcAllowance(undefined);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, walletAddress]);

    const refetchAllowance = useCallback(async () => {
        await fetchAllowance();
    }, [fetchAllowance]);

    // Fetch allowance when wallet connects/disconnects
    useEffect(() => {
        fetchAllowance();
    }, [fetchAllowance]);

    // Auto-refresh allowance every 2 seconds (like your pattern)
    useEffect(() => {
        if (!isConnected || !walletAddress) return;

        const interval = setInterval(() => {
            fetchAllowance();
        }, 2000);

        return () => clearInterval(interval);
    }, [isConnected, walletAddress, fetchAllowance]);

    const needsApproval = !usdcAllowance || usdcAllowance === BigInt(0);

    const value: AllowanceContextType = {
        usdcAllowance,
        isLoading,
        refetchAllowance,
        needsApproval
    };

    return (
        <AllowanceContext.Provider value={value}>
            {children}
        </AllowanceContext.Provider>
    );
};