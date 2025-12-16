import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./providers/WalletProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { AllowanceProvider } from "./providers/AllowanceProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Limitmore",
  description: "Court of Internet's Limitmore Exchange",
  icons: {
    icon: "/cofi.png",
    apple: "/cofi.png",
    shortcut: "/cofi.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ToastProvider>
          <WalletProvider>
            <AllowanceProvider>
              {children}
            </AllowanceProvider>
          </WalletProvider>
        </ToastProvider>
        <script src="https://widgets.coingecko.com/gecko-coin-price-chart-widget.js" async></script>
      </body>
    </html>
  );
}
