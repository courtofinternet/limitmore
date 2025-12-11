import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Limitmore Exchange",
  description: "Court of Internet's Limitmore Exchange",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
        <script src="https://widgets.coingecko.com/gecko-coin-price-chart-widget.js" async></script>
      </body>
    </html>
  );
}
