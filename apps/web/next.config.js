/** @type {import('next').NextConfig} */
const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const isDev = process.env.NODE_ENV !== 'production';

const resolvePackagePath = (packageName) => {
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`, { paths: [__dirname] }));
  } catch {
    return path.resolve(__dirname, `node_modules/${packageName}`);
  }
};

const reactPath = resolvePackagePath('react');
const reactDomPath = resolvePackagePath('react-dom');
const styledJsxPath = resolvePackagePath('styled-jsx');

const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl;
  }
})();

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

const mapboxConnectSources = [
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  'https://*.tiles.mapbox.com',
].join(' ');

const googleSources = [
  'https://accounts.google.com',
  'https://apis.google.com',
].join(' ');

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${googleSources}`
  : `script-src 'self' 'unsafe-inline' ${googleSources}`;

const ContentSecurityPolicy = [
  "default-src 'self'",
  scriptSrc,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com https://accounts.google.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${apiOrigin} ${mapboxConnectSources} ${googleSources}${isDev ? ' http://localhost:* ws://localhost:*' : ''}`,
  "frame-src 'self' https://accounts.google.com",
  "media-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
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

const nextConfig = {
  poweredByHeader: false,
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
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: reactPath,
      'react/jsx-runtime': path.join(reactPath, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(reactPath, 'jsx-dev-runtime.js'),
      'react-dom': reactDomPath,
      'styled-jsx': styledJsxPath,
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
