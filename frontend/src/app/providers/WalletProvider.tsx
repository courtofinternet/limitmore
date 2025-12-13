'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { baseSepolia } from 'wagmi/chains';
interface WalletContextValue {
    walletAddress: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// Privy-backed context provider
const PrivyWalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { ready, authenticated, login, logout } = usePrivy();
    const { wallets } = useWallets();

    const primaryWallet = wallets?.[0];
    const walletAddress = authenticated && primaryWallet ? primaryWallet.address : null;
    const isConnecting = !ready;

    const connect = async () => {
        await login();
    };

    const disconnect = async () => {
        await logout();
    };

    const value = useMemo(
        () => ({
            walletAddress,
            isConnected: !!walletAddress,
            isConnecting,
            connect,
            disconnect
        }),
        [walletAddress, isConnecting]
    );

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

    return (
        <PrivyProvider
            appId={appId ?? ''}
            clientId={clientId ?? ''}
            config={{
                defaultChain: baseSepolia,
                loginMethods: ['wallet'],
                appearance: {
                    theme: 'light',
                    accentColor: '#0f172a'
                }
            }}
        >
            <PrivyWalletContextProvider>{children}</PrivyWalletContextProvider>
        </PrivyProvider>
    );
};

export const useWallet = () => {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error('useWallet must be used within WalletProvider');
    }
    return ctx;
};
