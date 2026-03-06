import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  AxiosHeaders,
} from 'axios';
import { Platform } from 'react-native';
import {
  clearProfessionalToken,
  getProfessionalToken,
  setProfessionalToken,
} from './session';
import { isRetryableNetworkError } from './errors';
import { logWarn } from './logger';

type RetryableConfig = {
  _retryAttempt?: number;
  _authRetryAttempt?: number;
};

const MAX_RETRY_ATTEMPTS = 1;
const MAX_AUTH_RETRY_ATTEMPTS = 1;

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return 'http://localhost:3000'; // <-- Para probar en Web en tu PC
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000'; // <-- Para probar en el Emulador Android
  return 'http://localhost:3000'; 
}; // <-- Asegurate de que sea tu IP real

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authApi = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/auth/oauth')
    || url.includes('/auth/refresh')
    || url.includes('/auth/logout')
  );
};

const tokenFromAuthResponse = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const value = (data as { accessToken?: unknown }).accessToken;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post('/auth/refresh')
      .then(async (response: AxiosResponse<unknown>) => {
        const token = tokenFromAuthResponse(response.data);
        if (token) {
          await setProfessionalToken(token);
          return token;
        }
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use(
  async (config) => {
    const token = await getProfessionalToken();
    // Validamos que el token no sea la palabra "null" ni "undefined"
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (InternalAxiosRequestConfig & RetryableConfig & Record<string, unknown>) | undefined;

    if (!config) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'GET';
    const isIdempotent = method === 'GET' || method === 'HEAD';

    if (
      status === 401
      && !isAuthRoute(config.url)
      && (config._authRetryAttempt ?? 0) < MAX_AUTH_RETRY_ATTEMPTS
    ) {
      config._authRetryAttempt = (config._authRetryAttempt ?? 0) + 1;

      try {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          if (!config.headers) {
            config.headers = new AxiosHeaders();
          }
          if (config.headers instanceof AxiosHeaders) {
            config.headers.set('Authorization', `Bearer ${refreshedToken}`);
          } else {
            (config.headers as Record<string, unknown>).Authorization = `Bearer ${refreshedToken}`;
          }
          return api.request(config);
        }
      } catch {
        logWarn('api', 'refresh failed after 401');
      }

      await clearProfessionalToken();
      return Promise.reject(error);
    }

    if (!isRetryableNetworkError(error) || !isIdempotent) {
      return Promise.reject(error);
    }

    const retryAttempt = config._retryAttempt ?? 0;
    if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
      return Promise.reject(error);
    }

    config._retryAttempt = retryAttempt + 1;
    return api.request(config as AxiosRequestConfig);
  },
);

export default api;