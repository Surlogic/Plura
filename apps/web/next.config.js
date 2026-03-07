/** @type {import('next').NextConfig} */
const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  eslint: {
    ignoreDuringBuilds: true,  // deshabilitar ESLint durante el build para evitar errores de configuración
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
