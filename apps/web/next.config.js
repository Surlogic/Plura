/** @type {import('next').NextConfig} */
const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const nextPackagePath = path.dirname(require.resolve('next/package.json', { paths: [__dirname] }));
const nextReactPath = path.dirname(require.resolve('react/package.json', { paths: [nextPackagePath] }));
const nextReactDomPath = path.dirname(require.resolve('react-dom/package.json', { paths: [nextPackagePath] }));

const apiImageRemotePattern = (() => {
  try {
    const parsed = new URL(apiUrl);
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    return null;
  }
})();

const extraImageRemoteHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((hostname) => ({
    protocol: 'https',
    hostname,
  }));

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Required for OAuth popup flows (Google/Apple) so callback can access window.opener.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const distDir = process.env.NEXT_BUILD_DIR || '.next';

const nextConfig = {
  poweredByHeader: false,
  distDir,
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      ...(apiImageRemotePattern ? [apiImageRemotePattern] : []),
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      ...extraImageRemoteHosts,
    ],
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: nextReactPath,
      'react/jsx-runtime': path.join(nextReactPath, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(nextReactPath, 'jsx-dev-runtime.js'),
      'react-dom': nextReactDomPath,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
