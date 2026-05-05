import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@optimizely/react-sdk'],
};

export default nextConfig;
