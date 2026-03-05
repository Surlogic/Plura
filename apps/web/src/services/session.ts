const ACCESS_TOKEN_STORAGE_KEY = 'plura_access_token_fallback';

let inMemoryAccessToken: string | null = null;

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

export const setAuthAccessToken = (token?: string | null) => {
  const normalized = normalizeToken(token);
  inMemoryAccessToken = normalized;
  if (typeof window === 'undefined') return;
  if (normalized) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalized);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
};

export const clearAuthAccessToken = () => {
  inMemoryAccessToken = null;
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const getProfessionalToken = (): string | null => getAuthAccessToken();

export const setProfessionalToken = (token: string) => {
  setAuthAccessToken(token);
};

export const clearProfessionalToken = () => {
  clearAuthAccessToken();
};

export const getClientToken = (): string | null => getAuthAccessToken();

export const setClientToken = (token: string) => {
  setAuthAccessToken(token);
};

export const clearClientToken = () => {
  clearAuthAccessToken();
};
