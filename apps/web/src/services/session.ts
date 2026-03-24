const ACCESS_TOKEN_STORAGE_KEY = 'plura_access_token_fallback';
const SESSION_HINT_STORAGE_KEY = 'plura_auth_session_hint';
const SESSION_ROLE_STORAGE_KEY = 'plura_auth_session_role';

export type KnownAuthSessionRole = 'CLIENT' | 'PROFESSIONAL';

let inMemoryAccessToken: string | null = null;
let inMemorySessionHint: boolean | null = null;
let inMemorySessionRole: KnownAuthSessionRole | null | undefined;

const normalizeToken = (token?: string | null) => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSessionRole = (value?: string | null): KnownAuthSessionRole | null => {
  if (value === 'CLIENT' || value === 'PROFESSIONAL') {
    return value;
  }
  return null;
};

export const getAuthAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;
  const stored = normalizeToken(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  inMemoryAccessToken = stored;
  return stored;
};

export const getKnownAuthSessionRole = (): KnownAuthSessionRole | null => {
  if (typeof inMemorySessionRole !== 'undefined') {
    return inMemorySessionRole;
  }
  if (typeof window === 'undefined') {
    inMemorySessionRole = null;
    return inMemorySessionRole;
  }
  const storedRole = normalizeSessionRole(window.localStorage.getItem(SESSION_ROLE_STORAGE_KEY));
  inMemorySessionRole = storedRole;
  return storedRole;
};

export const hasKnownAuthSession = (): boolean => {
  if (getAuthAccessToken()) return true;
  if (getKnownAuthSessionRole()) return true;
  if (inMemorySessionHint !== null) return inMemorySessionHint;
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(SESSION_HINT_STORAGE_KEY) === '1';
  inMemorySessionHint = stored;
  return stored;
};

export const setKnownAuthSession = (
  value: boolean,
  role?: KnownAuthSessionRole | null,
) => {
  inMemorySessionHint = value;
  if (!value) {
    inMemorySessionRole = null;
  } else if (role) {
    inMemorySessionRole = role;
  }
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  }

  if (!value || role === null) {
    window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  } else if (role) {
    window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
  }
};

export const setKnownAuthSessionRole = (role?: KnownAuthSessionRole | null) => {
  inMemorySessionRole = role ?? null;
  if (role) {
    inMemorySessionHint = true;
  }
  if (typeof window === 'undefined') return;
  if (role) {
    window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  }
};

export const setAuthAccessToken = (
  token?: string | null,
  role?: KnownAuthSessionRole | null,
) => {
  const normalized = normalizeToken(token);
  inMemoryAccessToken = normalized;
  if (normalized) {
    inMemorySessionHint = true;
    if (role) {
      inMemorySessionRole = role;
    }
  }
  if (typeof window === 'undefined') return;
  if (normalized) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalized);
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, '1');
    if (role) {
      window.localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
    }
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    if (role === null) {
      window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
    }
  }
};

export const clearAuthAccessToken = () => {
  inMemoryAccessToken = null;
  inMemorySessionHint = false;
  inMemorySessionRole = null;
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
};