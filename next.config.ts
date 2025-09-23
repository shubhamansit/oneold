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
    
    // Increase max asset size
    config.performance = {
      ...config.performance,
      maxAssetSize: 10000000, // 10MB
      maxEntrypointSize: 10000000, // 10MB
    };
    
    return config;
  },
};

export default nextConfig;
