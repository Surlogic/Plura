const ACCESS_TOKEN_STORAGE_KEY = 'plura_access_token_fallback';
const SESSION_HINT_STORAGE_KEY = 'plura_auth_session_hint';

let inMemoryAccessToken: string | null = null;
let inMemorySessionHint: boolean | null = null;

const normalizeToken = (token?: string | null) => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getAuthAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;
  const stored = normalizeToken(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  inMemoryAccessToken = stored;
  return stored;
};

export const hasKnownAuthSession = (): boolean => {
  if (inMemoryAccessToken) return true;
  if (inMemorySessionHint !== null) return inMemorySessionHint;
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(SESSION_HINT_STORAGE_KEY) === '1';
  inMemorySessionHint = stored;
  return stored;
};

export const setKnownAuthSession = (value: boolean) => {
  inMemorySessionHint = value;
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  }
};

export const setAuthAccessToken = (token?: string | null) => {
  const normalized = normalizeToken(token);
  inMemoryAccessToken = normalized;
  if (normalized) {
    inMemorySessionHint = true;
  }
  if (typeof window === 'undefined') return;
  if (normalized) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalized);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
};

export const clearAuthAccessToken = () => {
  inMemoryAccessToken = null;
  inMemorySessionHint = false;
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
};
