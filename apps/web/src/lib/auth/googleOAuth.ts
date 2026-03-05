export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_CHANNEL = 'plura_google_oauth_channel';
export const GOOGLE_OAUTH_REQUEST_KEY = 'plura_google_oauth_request';

const OAUTH_REQUEST_MAX_AGE_MS = 10 * 60 * 1000;

export type GoogleOAuthRequest = {
  state: string;
  nonce: string;
  createdAt: number;
};

export type GoogleOAuthResultPayload = {
  type: 'GOOGLE_OAUTH_RESULT';
  idToken: string | null;
  state: string | null;
  error: string | null;
  ts: number;
};

const createRandomString = (size = 32) => {
  const bytes = new Uint8Array(size);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const createGoogleOAuthRequest = (): GoogleOAuthRequest => ({
  state: createRandomString(16),
  nonce: createRandomString(24),
  createdAt: Date.now(),
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
      typeof parsed.nonce !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.createdAt > OAUTH_REQUEST_MAX_AGE_MS) {
      return null;
    }
    return {
      state: parsed.state,
      nonce: parsed.nonce,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
};

export const clearGoogleOAuthRequest = () => {
  sessionStorage.removeItem(GOOGLE_OAUTH_REQUEST_KEY);
};

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = window.atob(padded);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
};
