import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://pulse.walletconnect.org",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https:",
              "connect-src 'self' https://auth.privy.io https://sepolia.base.org https://base-sepolia.g.alchemy.com wss://relay.walletconnect.com wss://relay.walletconnect.org https://relay.walletconnect.com https://relay.walletconnect.org https://verify.walletconnect.com https://verify.walletconnect.org https://explorer-api.walletconnect.com https://pulse.walletconnect.org",
              "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ]
      }
    ]
  },
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
