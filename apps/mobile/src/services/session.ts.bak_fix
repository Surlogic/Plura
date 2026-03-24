import * as SecureStore from 'expo-secure-store';
import { logError, logWarn } from './logger';

const ACCESS_TOKEN_KEY = 'plura_access_token';
const REFRESH_TOKEN_KEY = 'plura_refresh_token';
const LEGACY_ACCESS_TOKEN_KEY = 'plura_professional_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'plura_professional_refresh_token';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

const normalizeToken = (token?: string | null) => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readSecureValue = async (key: string): Promise<string | null> => {
  try {
    return normalizeToken(await SecureStore.getItemAsync(key));
  } catch (error) {
    logWarn('session', `error leyendo ${key}`, error);
    return null;
  }
};

const getStoredToken = async (key: string, legacyKey?: string): Promise<string | null> => {
  const current = await readSecureValue(key);
  if (current) return current;

  if (!legacyKey) return null;

  const legacy = await readSecureValue(legacyKey);
  if (!legacy) return null;

  try {
    await SecureStore.setItemAsync(key, legacy);
    await SecureStore.deleteItemAsync(legacyKey);
  } catch (error) {
    logWarn('session', `error migrando ${legacyKey} -> ${key}`, error);
  }

  return legacy;
};

const setStoredToken = async (key: string, token?: string | null, legacyKey?: string) => {
  const normalized = normalizeToken(token);
  try {
    if (!normalized) {
      await SecureStore.deleteItemAsync(key);
      if (legacyKey) {
        await SecureStore.deleteItemAsync(legacyKey);
      }
      return;
    }

    await SecureStore.setItemAsync(key, normalized);
    if (legacyKey) {
      await SecureStore.deleteItemAsync(legacyKey);
    }
  } catch (error) {
    logError('session', `error guardando ${key}`, error);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  const stored = await getStoredToken(ACCESS_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY);
  inMemoryAccessToken = stored;
  return stored;
};

export const setAccessToken = async (token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized) {
    logWarn('session', 'access token vacio ignorado');
    return;
  }
  inMemoryAccessToken = normalized;
  await setStoredToken(ACCESS_TOKEN_KEY, normalized, LEGACY_ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (inMemoryRefreshToken) return inMemoryRefreshToken;
  const stored = await getStoredToken(REFRESH_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY);
  inMemoryRefreshToken = stored;
  return stored;
};

export const setRefreshToken = async (token?: string | null) => {
  const normalized = normalizeToken(token);
  inMemoryRefreshToken = normalized;
  await setStoredToken(REFRESH_TOKEN_KEY, normalized, LEGACY_REFRESH_TOKEN_KEY);
};

export const setSession = async (session: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) => {
  await Promise.all([
    session.accessToken
      ? setAccessToken(session.accessToken)
      : setStoredToken(ACCESS_TOKEN_KEY, null, LEGACY_ACCESS_TOKEN_KEY),
    setRefreshToken(session.refreshToken ?? null),
  ]);
  inMemoryAccessToken = normalizeToken(session.accessToken);
};

export const clearSession = async () => {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY),
    ]);
  } catch (error) {
    logError('session', 'error borrando sesion', error);
  }
};

// Compatibilidad backward-compatible
export const getProfessionalToken = getAccessToken;
export const setProfessionalToken = setAccessToken;
export const getProfessionalRefreshToken = getRefreshToken;
export const setProfessionalRefreshToken = setRefreshToken;
export const setProfessionalSession = setSession;
export const clearProfessionalToken = clearSession;