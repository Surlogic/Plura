export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_CHANNEL = 'plura_google_oauth_channel';
export const GOOGLE_OAUTH_REQUEST_KEY = 'plura_google_oauth_request';
export const GOOGLE_OAUTH_REDIRECT_RESULT_KEY = 'plura_google_oauth_redirect_result';

const OAUTH_REQUEST_MAX_AGE_MS = 10 * 60 * 1000;
const OAUTH_RESULT_MAX_AGE_MS = 2 * 60 * 1000;

export type GoogleOAuthMode = 'popup' | 'redirect';

export type GoogleOAuthRequest = {
  state: string;
  codeVerifier: string;
  createdAt: number;
  mode?: GoogleOAuthMode;
  returnTo?: string;
  redirectUri?: string;
};

export type GoogleOAuthResultPayload = {
  type: 'GOOGLE_OAUTH_RESULT';
  code: string | null;
  state: string | null;
  error: string | null;
  ts: number;
};

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');

export const getGoogleOAuthAppOrigin = () => {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    try {
      return normalizeOrigin(new URL(configuredOrigin).origin);
    } catch {
      return normalizeOrigin(configuredOrigin);
    }
  }

  if (typeof window !== 'undefined') {
    return normalizeOrigin(window.location.origin);
  }

  return '';
};

export const getGoogleOAuthRedirectUri = () => {
  const origin = getGoogleOAuthAppOrigin();
  return `${origin}/oauth/callback`;
};

export const buildGoogleOAuthReturnTo = (pathWithQueryAndHash: string) => {
  const origin = getGoogleOAuthAppOrigin();
  if (!origin) return pathWithQueryAndHash || '/';
  if (!pathWithQueryAndHash || pathWithQueryAndHash === '/') return `${origin}/`;
  return `${origin}${pathWithQueryAndHash.startsWith('/') ? '' : '/'}${pathWithQueryAndHash}`;
};

const createRandomString = (size = 32) => {
  const bytes = new Uint8Array(size);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const createGoogleOAuthRequest = (
  options: { mode?: GoogleOAuthMode; returnTo?: string; redirectUri?: string } = {},
): GoogleOAuthRequest => ({
  state: createRandomString(16),
  codeVerifier: createRandomString(64),
  createdAt: Date.now(),
  mode: options.mode || 'popup',
  returnTo: options.returnTo,
  redirectUri: options.redirectUri,
});

export const saveGoogleOAuthRequest = (payload: GoogleOAuthRequest) => {
  sessionStorage.setItem(GOOGLE_OAUTH_REQUEST_KEY, JSON.stringify(payload));
};

export const getGoogleOAuthRequest = (): GoogleOAuthRequest | null => {
  const raw = sessionStorage.getItem(GOOGLE_OAUTH_REQUEST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthRequest>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > OAUTH_REQUEST_MAX_AGE_MS) {
      return null;
    }
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      createdAt: parsed.createdAt,
      mode: parsed.mode === 'redirect' ? 'redirect' : 'popup',
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
      redirectUri: typeof parsed.redirectUri === 'string' ? parsed.redirectUri : undefined,
    };
  } catch {
    return null;
  }
};

export const clearGoogleOAuthRequest = () => {
  sessionStorage.removeItem(GOOGLE_OAUTH_REQUEST_KEY);
};

export const saveGoogleOAuthRedirectResult = (payload: GoogleOAuthResultPayload) => {
  sessionStorage.setItem(GOOGLE_OAUTH_REDIRECT_RESULT_KEY, JSON.stringify(payload));
};

export const getGoogleOAuthRedirectResult = (): GoogleOAuthResultPayload | null => {
  const raw = sessionStorage.getItem(GOOGLE_OAUTH_REDIRECT_RESULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthResultPayload>;
    if (parsed.type !== 'GOOGLE_OAUTH_RESULT') return null;
    const ts = typeof parsed.ts === 'number' ? parsed.ts : 0;
    if (!ts || Date.now() - ts > OAUTH_RESULT_MAX_AGE_MS) {
      return null;
    }
    return {
      type: 'GOOGLE_OAUTH_RESULT',
      code: typeof parsed.code === 'string' ? parsed.code : null,
      state: typeof parsed.state === 'string' ? parsed.state : null,
      error: typeof parsed.error === 'string' ? parsed.error : null,
      ts,
    };
  } catch {
    return null;
  }
};

export const clearGoogleOAuthRedirectResult = () => {
  sessionStorage.removeItem(GOOGLE_OAUTH_REDIRECT_RESULT_KEY);
};

const base64UrlEncode = (bytes: Uint8Array) => {
  const binary = String.fromCharCode(...bytes);
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const createCodeChallenge = async (codeVerifier: string) => {
  const payload = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', payload);
  return base64UrlEncode(new Uint8Array(digest));
};
