import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bun:sqlite'],
  turbopack: {},
};

export default nextConfig;
