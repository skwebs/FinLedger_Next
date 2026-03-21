import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
    }
    // Prevent webpack from rewriting xlsx's internal require() calls
    // xlsx is CJS and must be treated as external on the client
    if (!isServer) {
      config.externals = config.externals || []
      // Do NOT externalize xlsx — instead let webpack bundle it
      // but tell it xlsx has no 'default' export
    }
    return config
  },
  // Transpile xlsx so Next.js handles the CJS→ESM conversion correctly
  transpilePackages: ['xlsx'],
}

export default nextConfig
