import type { NextConfig } from "next";

if (!process.env.CI) {
  require("./src/lib/env");
}

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
