import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: [
    "@privy-io/react-auth",
    "@reown/appkit",
    "@walletconnect/ethereum-provider"
  ],
  webpack: (config, { isServer }) => {
    // Node.js polyfills for client-side
    if (!isServer) {
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
        path: false,
        buffer: false,
        util: false,
      };
    }

    // Exclude problematic files and packages
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push(
        'why-is-node-running',
        'thread-stream'
      );
    }

    // Ignore problematic file types in dependencies
    config.module.rules.push(
      {
        test: /node_modules[\/\\].*\.(test|spec|md|zip|txt|sh|yml|yaml|LICENSE)$/,
        use: 'ignore-loader'
      },
      {
        test: /node_modules[\/\\]thread-stream[\/\\]/,
        use: 'ignore-loader'
      }
    );

    return config;
  }
};

export default nextConfig;
