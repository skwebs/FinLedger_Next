import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for xlsx (SheetJS) — disables minification issues
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, stream: false }
    return config
  },
}

export default nextConfig
