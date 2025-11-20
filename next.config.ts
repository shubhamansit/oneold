import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Increase memory limit for large files
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          data: {
            test: /[\\/]data[\\/]/,
            name: 'data',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };

    // Disable problematic pack file cache strategy to prevent memory allocation errors
    // Next.js will fall back to standard filesystem caching
    if (config.cache && typeof config.cache === 'object') {
      // Ensure we're using filesystem cache (Next.js default)
      // This prevents the PackFileCacheStrategy from causing memory issues
      config.cache.maxMemoryGenerations = 1;
    }

    return config;
  },
};

export default nextConfig;
