import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'bcrypt'],
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'better-sqlite3', 'bcrypt'];
    return config;
  },
};

export default nextConfig;
