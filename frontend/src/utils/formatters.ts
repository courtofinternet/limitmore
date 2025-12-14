/**
 * Shared formatting utilities for the application
 */

export const formatVolume = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M USDC';
    }
    if (num >= 10000) {
        return (num / 1000).toFixed(0) + 'k USDC';
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USDC';
};

// Alternative compact format with localeString for exact amounts
export const formatUsdcCompact = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M USDC';
    }
    if (num >= 10000) {
        return (num / 1000).toFixed(0) + 'k USDC';
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USDC';
};

export const formatUsdcAmount = (num: number): string => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USDC';
};

export const formatAddress = (addr?: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 5)}...${addr.slice(-3)}`;
};

export const formatCountdown = (timeLeftMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

export const formatDeadlineDateTime = (deadlineSeconds: number): string => {
    const date = new Date(deadlineSeconds * 1000);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatExactUsdc = (num: number): string => {
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
};

export const formatResolutionDate = (deadline?: number | string): string | null => {
    if (deadline === undefined || deadline === null) return null;
    let ms: number | null = null;
    if (typeof deadline === 'string') {
        const numeric = Number(deadline);
        if (Number.isFinite(numeric)) {
            ms = numeric * 1000;
        } else {
            const parsed = Date.parse(deadline);
            ms = Number.isNaN(parsed) ? null : parsed;
        }
    } else {
        ms = deadline * 1000;
    }
    if (ms === null) return null;
    const date = new Date(ms);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};