import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dental-pms/ui', '@dental-pms/types', '@dental-pms/db'],
};

export default nextConfig;
