import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  AxiosHeaders,
} from 'axios';
import { Platform } from 'react-native';
import {
  clearProfessionalToken,
  getProfessionalRefreshToken,
  getProfessionalToken,
  setProfessionalSession,
} from './session';
import { isRetryableNetworkError } from './errors';
import { logWarn } from './logger';

type RetryableConfig = {
  _retryAttempt?: number;
  _authRetryAttempt?: number;
};

const MAX_RETRY_ATTEMPTS = 1;
const MAX_AUTH_RETRY_ATTEMPTS = 1;
const CLIENT_PLATFORM_HEADER = 'X-Plura-Client-Platform';
const SESSION_TRANSPORT_HEADER = 'X-Plura-Session-Transport';

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

const refreshTokenFromAuthResponse = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const value = (data as { refreshToken?: unknown }).refreshToken;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const persistSessionFromAuthResponse = async (data: unknown): Promise<string | null> => {
  const accessToken = tokenFromAuthResponse(data);
  const refreshToken = refreshTokenFromAuthResponse(data);
  if (accessToken || refreshToken) {
    await setProfessionalSession({ accessToken, refreshToken });
  }
  return accessToken;
};

const setHeaderValue = (
  config: InternalAxiosRequestConfig,
  name: string,
  value: string,
) => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(name, value);
  } else {
    (config.headers as Record<string, unknown>)[name] = value;
  }
};

const applyClientHeaders = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  setHeaderValue(config, CLIENT_PLATFORM_HEADER, 'MOBILE');
  if (isAuthRoute(config.url)) {
    setHeaderValue(config, SESSION_TRANSPORT_HEADER, 'BODY');
  }
  return config;
};

const attachAuthorizationHeader = async (
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> => {
  applyClientHeaders(config);
  const token = await getProfessionalToken();
  if (token && token !== 'null' && token !== 'undefined') {
    setHeaderValue(config, 'Authorization', `Bearer ${token}`);
  }
  return config;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    const refreshToken = await getProfessionalRefreshToken();
    if (!refreshToken) {
      return null;
    }
    refreshPromise = authApi
      .post('/auth/refresh', { refreshToken })
      .then(async (response: AxiosResponse<unknown>) => {
        return persistSessionFromAuthResponse(response.data);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use(
  async (config) => {
    if (isAuthRoute(config.url)) {
      return applyClientHeaders(config);
    }
    return attachAuthorizationHeader(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

authApi.interceptors.request.use(
  async (config) => attachAuthorizationHeader(config),
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  async (response) => {
    if (isAuthRoute(response.config.url)) {
      await persistSessionFromAuthResponse(response.data);
    }
    return response;
  },
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
