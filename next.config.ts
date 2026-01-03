import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  // For GitHub Pages static export
  ...(isGitHubPages && {
    output: 'export',
    basePath: '/truth_engine',
    assetPrefix: '/truth_engine/',
    images: {
      unoptimized: true,
    },
    env: {
      NEXT_PUBLIC_BASE_PATH: '/truth_engine',
    },
  }),
  
  // Disable trailing slashes for cleaner URLs
  trailingSlash: false,
};

export default nextConfig;
