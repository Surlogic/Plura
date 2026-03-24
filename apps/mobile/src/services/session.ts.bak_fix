import * as SecureStore from 'expo-secure-store';
import { logError, logWarn } from './logger';

const ACCESS_TOKEN_KEY = 'plura_professional_access_token';
const REFRESH_TOKEN_KEY = 'plura_professional_refresh_token';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

const normalizeToken = (token?: string | null) => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getStoredToken = async (key: string): Promise<string | null> => {
  try {
    return normalizeToken(await SecureStore.getItemAsync(key));
  } catch (error) {
    logWarn('session', `error leyendo ${key}`, error);
    return null;
  }
};

const setStoredToken = async (key: string, token?: string | null) => {
  const normalized = normalizeToken(token);
  try {
    if (!normalized) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await SecureStore.setItemAsync(key, normalized);
  } catch (error) {
    logError('session', `error guardando ${key}`, error);
  }
};

export const getProfessionalToken = async (): Promise<string | null> => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  const stored = await getStoredToken(ACCESS_TOKEN_KEY);
  inMemoryAccessToken = stored;
  return stored;
};

export const setProfessionalToken = async (token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized) {
    logWarn('session', 'access token vacio ignorado');
    return;
  }
  inMemoryAccessToken = normalized;
  await setStoredToken(ACCESS_TOKEN_KEY, normalized);
};

export const getProfessionalRefreshToken = async (): Promise<string | null> => {
  if (inMemoryRefreshToken) return inMemoryRefreshToken;
  const stored = await getStoredToken(REFRESH_TOKEN_KEY);
  inMemoryRefreshToken = stored;
  return stored;
};

export const setProfessionalRefreshToken = async (token?: string | null) => {
  const normalized = normalizeToken(token);
  inMemoryRefreshToken = normalized;
  await setStoredToken(REFRESH_TOKEN_KEY, normalized);
};

export const setProfessionalSession = async (session: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) => {
  await Promise.all([
    session.accessToken ? setProfessionalToken(session.accessToken) : setStoredToken(ACCESS_TOKEN_KEY, null),
    setProfessionalRefreshToken(session.refreshToken ?? null),
  ]);
  inMemoryAccessToken = normalizeToken(session.accessToken);
};

export const clearProfessionalToken = async () => {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } catch (error) {
    logError('session', 'error borrando sesion', error);
  }
};
