import axios from 'axios';
import type {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { AxiosHeaders } from 'axios';
import {
  clearAuthAccessToken,
  getAuthAccessToken,
  hasKnownAuthSession,
  type KnownAuthSessionRole,
  setKnownAuthSession,
  setAuthAccessToken,
} from '@/services/session';
import { getAnalyticsSessionId } from '@/lib/analytics/session';
import { isAuthSessionError } from '@/lib/auth/sessionErrors';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const CLIENT_PLATFORM_HEADER = 'X-Plura-Client-Platform';
const ANALYTICS_SESSION_HEADER = 'X-Plura-Analytics-Session-Id';
const SESSION_TRANSPORT_HEADER = 'X-Plura-Session-Transport';

type AuthAwareAxiosRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

const authTokenFromResponse = (
  responseData: unknown,
): string | null => {
  if (!responseData || typeof responseData !== 'object') return null;
  const token = (responseData as { accessToken?: unknown }).accessToken;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

const roleFromAccessToken = (token?: string | null): KnownAuthSessionRole | undefined => {
  try {
    if (!token) return undefined;
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw) as { role?: unknown };
    if (payload.role === 'USER') return 'CLIENT';
    if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
    return undefined;
  } catch {
    return undefined;
  }
};

const getUrlPathname = (url?: string) => {
  if (!url) return '';
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url.split('?')[0] || '';
  }
};

const isAuthRoute = (url?: string) => {
  const pathname = getUrlPathname(url);
  if (!pathname) return false;
  return (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname === '/auth/oauth' ||
    pathname === '/auth/refresh' ||
    pathname === '/auth/logout'
  );
};

const isSessionMutatingAuthRoute = (url?: string) => {
  const pathname = getUrlPathname(url);
  if (!pathname) return false;
  return (
    pathname.startsWith('/auth/login') ||
    pathname === '/auth/oauth' ||
    pathname === '/auth/refresh' ||
    pathname === '/auth/logout'
  );
};

const isLogoutRoute = (url?: string) => {
  if (!url) return false;
  return url.includes('/auth/logout');
};

const isRouteOrChild = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

const isProfessionalProtectedPath = (path: string) =>
  isRouteOrChild(path, '/profesional/dashboard') ||
  isRouteOrChild(path, '/profesional/notificaciones');

const clientProtectedRoutes = [
  '/cliente/dashboard',
  '/cliente/inicio',
  '/cliente/reservas',
  '/cliente/favoritos',
  '/cliente/perfil',
  '/cliente/configuracion',
];

const isClientProtectedPath = (path: string) =>
  clientProtectedRoutes.some((route) => isRouteOrChild(path, route));

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (isProfessionalProtectedPath(path)) {
    window.location.href = '/profesional/auth/login';
    return;
  }
  if (isClientProtectedPath(path)) {
    window.location.href = '/cliente/auth/login';
  }
};

// Variable de módulo para deduplicar refreshes concurrentes.
// El guard typeof window evita que se comparta entre requests en SSR.
let refreshPromise: Promise<void> | null = null;

const attachAuthHeader = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(CLIENT_PLATFORM_HEADER, 'WEB');
    const analyticsSessionId = getAnalyticsSessionId();
    if (analyticsSessionId) {
      config.headers.set(ANALYTICS_SESSION_HEADER, analyticsSessionId);
    }
    if (isAuthRoute(config.url)) {
      config.headers.set(SESSION_TRANSPORT_HEADER, 'COOKIE');
    }
  } else {
    const analyticsSessionId = getAnalyticsSessionId();
    config.headers = AxiosHeaders.from({
      ...(config.headers as AxiosRequestHeaders | undefined),
      [CLIENT_PLATFORM_HEADER]: 'WEB',
      ...(analyticsSessionId ? { [ANALYTICS_SESSION_HEADER]: analyticsSessionId } : {}),
      ...(isAuthRoute(config.url) ? { [SESSION_TRANSPORT_HEADER]: 'COOKIE' } : {}),
    });
  }
  if (isAuthRoute(config.url)) return config;
  const token = getAuthAccessToken();
  if (!token) return config;

  const headers = config.headers as AxiosRequestHeaders | undefined;
  const hasAuthorizationHeader =
    typeof (headers as Record<string, unknown> | undefined)?.Authorization === 'string' ||
    typeof (headers as Record<string, unknown> | undefined)?.authorization === 'string';

  if (!hasAuthorizationHeader) {
    config.headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
    } as AxiosRequestHeaders;
  }
  return config;
};

api.interceptors.request.use((config) => attachAuthHeader(config));
authApi.interceptors.request.use((config) => attachAuthHeader(config));

api.interceptors.response.use(
  (response) => {
    const token = authTokenFromResponse(response.data);
    if (token) {
      setAuthAccessToken(token, roleFromAccessToken(token));
    } else if (isSessionMutatingAuthRoute(response.config.url)) {
      if (isLogoutRoute(response.config.url)) {
        clearAuthAccessToken();
      } else {
        setKnownAuthSession(true);
        const currentToken = getAuthAccessToken();
        if (currentToken) {
          setAuthAccessToken(currentToken);
        }
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AuthAwareAxiosRequestConfig;
    const status = error.response?.status;

    if (
      status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.skipAuthRefresh &&
      !isAuthRoute(originalRequest?.url)
    ) {
      originalRequest._retry = true;

      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      if (!hasKnownAuthSession()) {
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = authApi
          .post('/auth/refresh')
          .then((response) => {
            const token = authTokenFromResponse(response.data);
            if (token) {
              setAuthAccessToken(token, roleFromAccessToken(token));
            } else {
              setKnownAuthSession(true);
            }
          })
          .catch((refreshError) => {
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        if (isAuthSessionError(refreshError)) {
          clearAuthAccessToken();
          redirectToLogin();
        }
        return Promise.reject(refreshError ?? error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
