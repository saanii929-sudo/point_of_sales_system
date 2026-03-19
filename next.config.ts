import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  css: {
    // Use PostCSS pipeline for Tailwind v3 compatibility
    postcss: true,
  },
};

export default nextConfig;
