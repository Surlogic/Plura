/** @type {import('next').NextConfig} */
const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const imageCdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL || 'https://img.surlogicuy.com';
const isProduction = process.env.NODE_ENV === 'production';

const nextPackagePath = path.dirname(require.resolve('next/package.json', { paths: [__dirname] }));
const nextReactPath = path.dirname(require.resolve('react/package.json', { paths: [nextPackagePath] }));
const nextReactDomPath = path.dirname(require.resolve('react-dom/package.json', { paths: [nextPackagePath] }));

const toRemotePattern = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    return null;
  }
};

const apiImageRemotePattern = toRemotePattern(apiUrl);
const imageCdnRemotePattern = toRemotePattern(imageCdnUrl);

const extraImageRemoteHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((hostname) => ({
    protocol: 'https',
    hostname,
  }));

const toOrigin = (rawUrl) => {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
};

const remotePatternToOrigin = (pattern) => {
  if (!pattern?.protocol || !pattern?.hostname) return null;
  return `${pattern.protocol}://${pattern.hostname}${pattern.port ? `:${pattern.port}` : ''}`;
};

const compactUnique = (values) => Array.from(new Set(values.filter(Boolean)));

const splitOrigins = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(toOrigin)
    .filter(Boolean);

const apiOrigin = toOrigin(apiUrl);
const imageCdnOrigin = toOrigin(imageCdnUrl);
const extraImageOrigins = extraImageRemoteHosts.map(remotePatternToOrigin).filter(Boolean);
const internalOpsOrigin = toOrigin(process.env.NEXT_PUBLIC_INTERNAL_OPS_API_URL || '');
const internalOpsAllowedOrigins = splitOrigins(
  process.env.NEXT_PUBLIC_INTERNAL_OPS_ALLOWED_ORIGINS || '',
);

const buildContentSecurityPolicy = () => {
  const directives = [
    ['default-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['object-src', ["'none'"]],
    ['frame-ancestors', ["'self'"]],
    ['form-action', ["'self'"]],
    [
      'script-src',
      compactUnique([
        "'self'",
        "'unsafe-inline'",
        !isProduction ? "'unsafe-eval'" : null,
        'blob:',
        'https://accounts.google.com',
        'https://apis.google.com',
        'https://www.gstatic.com',
        'https://www.googletagmanager.com',
        'https://sdk.mercadopago.com',
        'https://*.mercadopago.com',
        'https://api.mapbox.com',
      ]),
    ],
    [
      'style-src',
      ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://api.mapbox.com', 'https://unpkg.com'],
    ],
    ['font-src', ["'self'", 'data:', 'https://fonts.gstatic.com']],
    [
      'img-src',
      compactUnique([
        "'self'",
        'data:',
        'blob:',
        apiOrigin,
        imageCdnOrigin,
        ...extraImageOrigins,
        'https://images.unsplash.com',
        'https://images.pexels.com',
        'https://res.cloudinary.com',
        'https://api.qrserver.com',
        'https://*.mapbox.com',
        'https://*.basemaps.cartocdn.com',
        'https://*.mercadopago.com',
      ]),
    ],
    [
      'connect-src',
      compactUnique([
        "'self'",
        apiOrigin,
        imageCdnOrigin,
        internalOpsOrigin,
        ...internalOpsAllowedOrigins,
        'https://api.mapbox.com',
        'https://events.mapbox.com',
        'https://*.tiles.mapbox.com',
        'https://accounts.google.com',
        'https://oauth2.googleapis.com',
        'https://www.googleapis.com',
        'https://api.mercadopago.com',
        'https://*.mercadopago.com',
      ]),
    ],
    ['frame-src', ["'self'", 'https://accounts.google.com', 'https://*.mercadopago.com', 'https://sdk.mercadopago.com']],
    ['media-src', ["'self'", 'blob:', 'data:']],
    ['manifest-src', ["'self'"]],
    ['worker-src', ["'self'", 'blob:']],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
};

const contentSecurityPolicy = buildContentSecurityPolicy();

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Required for OAuth popup flows (Google) so callback can access window.opener.
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
      ...(imageCdnRemotePattern ? [imageCdnRemotePattern] : []),
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
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: nextReactPath,
      'react/jsx-runtime': path.join(nextReactPath, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(nextReactPath, 'jsx-dev-runtime.js'),
      'react-dom': nextReactDomPath,
    };

    // Performance budget: warn at 250 KB, error at 400 KB per chunk (client only).
    if (!isServer) {
      config.performance = {
        hints: 'warning',
        maxAssetSize: 400_000,
        maxEntrypointSize: 400_000,
      };
    }

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
