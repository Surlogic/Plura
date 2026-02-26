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

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/profesional')) {
    window.location.href = '/profesional/auth/login';
    return;
  }
  if (path.startsWith('/cliente')) {
    window.location.href = '/cliente/auth/login';
    return;
  }
};

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

      if (!refreshPromise) {
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
