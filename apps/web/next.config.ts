import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dental-pms/ui', '@dental-pms/types', '@dental-pms/db', '@dental-pms/integrations'],
};

export default nextConfig;
