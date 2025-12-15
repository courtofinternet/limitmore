import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: '/Users/joaquinbressan/Documents/GitHub/limitmore/frontend',
  transpilePackages: [
    "@privy-io/react-auth",
    "@reown/appkit",
    "@walletconnect/ethereum-provider"
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      assert: false,
      http: false,
      https: false,
      os: false,
      url: false,
      '@react-native-async-storage/async-storage': false,
    };

    // Ignore problematic files from dependencies
    config.module.rules.push({
      test: /node_modules.*\.(test|spec|md|zip|txt|sh|yml|yaml)\.(js|ts|md|zip|txt|sh|yml|yaml)$/,
      use: 'ignore-loader'
    });

    return config;
  }
};

export default nextConfig;
