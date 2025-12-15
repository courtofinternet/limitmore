import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
    symbol: string; // e.g., "NASDAQ:GOOG"
}

function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clear previous usage to prevent duplicates if symbol changes or remount
        container.current.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "symbol": symbol,
            "width": "100%",
            "height": "100%", // Fit container
            "locale": "en",
            "dateRange": "12M",
            "colorTheme": "light",
            "isTransparent": true, // Let background show through if needed
            "autosize": true,
            "largeChartUrl": ""
        });

        // Create a widget container div for the script to render into via document.write or similar if it does, 
        // but this specific widget usually appends iframe. 
        // The provided snippet appends SCRIPT to container. 
        // The script execution creates the widget.
        const widgetContainer = document.createElement("div");
        widgetContainer.className = "tradingview-widget-container__widget";
        container.current.appendChild(widgetContainer);

        // Add script
        container.current.appendChild(script);

    }, [symbol]);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
            {/* The script will inject here */}
        </div>
    );
}

export default memo(TradingViewWidget);
