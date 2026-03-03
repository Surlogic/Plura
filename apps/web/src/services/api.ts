import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

const isRouteOrChilds = (path: string, route: string) =>
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
    return;
  }
};

// Variable de módulo para deduplicar refreshes concurrentes.
// El guard typeof window evita que se comparta entre requests en SSR.
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (
      status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute(originalRequest?.url)
    ) {
      originalRequest._retry = true;

      if (!refreshPromise && typeof window !== 'undefined') {
        refreshPromise = authApi
          .post('/auth/refresh')
          .then(() => undefined)
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
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
