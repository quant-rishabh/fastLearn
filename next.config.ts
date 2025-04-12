import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Skip ESLint during Vercel build
  },
  // ... you can add other config options here too
};

export default nextConfig;
