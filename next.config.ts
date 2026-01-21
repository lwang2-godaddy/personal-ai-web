import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

function getVersionEnv() {
  // On Vercel, use their built-in variables
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    const version = require('./package.json').version;
    const commitHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    return {
      NEXT_PUBLIC_APP_VERSION: version,
      NEXT_PUBLIC_COMMIT_HASH: commitHash,
      NEXT_PUBLIC_FULL_VERSION: `v${version} (${commitHash})`
    };
  }

  // For local builds, try to read generated file
  try {
    const versionInfo = require('./lib/generated-version.json');
    return {
      NEXT_PUBLIC_APP_VERSION: versionInfo.version,
      NEXT_PUBLIC_COMMIT_HASH: versionInfo.commitHash,
      NEXT_PUBLIC_FULL_VERSION: versionInfo.fullVersion
    };
  } catch (error) {
    const version = require('./package.json').version;
    return {
      NEXT_PUBLIC_APP_VERSION: version,
      NEXT_PUBLIC_COMMIT_HASH: 'dev',
      NEXT_PUBLIC_FULL_VERSION: `v${version} (dev)`
    };
  }
}

const nextConfig: NextConfig = {
  env: getVersionEnv(),

  // Image optimization for Firebase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Rewrites for subdomain URL support
  // Mobile app links to docs.sircharge.app/* and support.sircharge.app
  // These rewrites handle those subdomains when DNS is configured
  async rewrites() {
    return {
      beforeFiles: [
        // docs.sircharge.app/getting-started -> /docs/getting-started
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'docs.sircharge.app' }],
          destination: '/docs/:path*',
        },
        // support.sircharge.app -> /support
        {
          source: '/',
          has: [{ type: 'host', value: 'support.sircharge.app' }],
          destination: '/support',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'support.sircharge.app' }],
          destination: '/support/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
