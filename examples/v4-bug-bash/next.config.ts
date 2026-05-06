import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: process.env.NEXT_PUBLIC_STRICT_MODE === 'true',
  transpilePackages: ['@optimizely/react-sdk'],
};

export default nextConfig;
