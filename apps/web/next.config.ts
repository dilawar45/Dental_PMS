import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dental-pms/ui', '@dental-pms/types', '@dental-pms/db', '@dental-pms/integrations'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
