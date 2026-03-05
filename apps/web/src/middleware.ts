import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const resolveOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};

const apiOrigin = resolveOrigin(apiUrl);

const createNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const buildCsp = (nonce?: string) => {
  const scriptSources = [
    "'self'",
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://appleid.cdn-apple.com',
  ];
  if (nonce) {
    scriptSources.splice(1, 0, `'nonce-${nonce}'`);
  }
  if (isDev) {
    scriptSources.push("'unsafe-inline'", "'unsafe-eval'");
  }

  const connectSources = [
    "'self'",
    apiOrigin,
    'https://api.mapbox.com',
    'https://events.mapbox.com',
    'https://*.tiles.mapbox.com',
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://appleid.apple.com',
    'https://appleid.cdn-apple.com',
  ];
  if (isDev) {
    connectSources.push('http://localhost:*', 'ws://localhost:*');
  }

  const styleSources = [
    "'self'",
    'https://fonts.googleapis.com',
    'https://api.mapbox.com',
    'https://accounts.google.com',
  ];
  if (nonce) {
    styleSources.splice(1, 0, `'nonce-${nonce}'`);
  }
  if (isDev) {
    styleSources.push("'unsafe-inline'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "worker-src 'self' blob:",
    `style-src ${styleSources.join(' ')}`,
    // Next/Image and dynamic UI rely on inline style attrs in multiple pages.
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSources.join(' ')}`,
    "frame-src 'self' https://accounts.google.com https://appleid.apple.com",
    "media-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};

export function middleware(request: NextRequest) {
  if (isDev) {
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', buildCsp());
    return response;
  }

  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
