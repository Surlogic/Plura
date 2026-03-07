import axios from 'axios';
import type {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  clearAuthAccessToken,
  getAuthAccessToken,
  setAuthAccessToken,
} from '@/services/session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const authTokenFromResponse = (
  responseData: unknown,
): string | null => {
  if (!responseData || typeof responseData !== 'object') return null;
  const token = (responseData as { accessToken?: unknown }).accessToken;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
};

const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/oauth') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

const isRouteOrChild = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

const isProfessionalProtectedPath = (path: string) =>
  isRouteOrChild(path, '/profesional/dashboard');

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
      setAuthAccessToken(token);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (
      status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute(originalRequest?.url)
    ) {
      originalRequest._retry = true;

      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = authApi
          .post('/auth/refresh')
          .then((response) => {
            const token = authTokenFromResponse(response.data);
            if (token) {
              setAuthAccessToken(token);
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
      } catch {
        clearAuthAccessToken();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
