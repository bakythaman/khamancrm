import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: isGithubPages ? '/khamancrm' : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
