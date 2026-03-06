import { isAxiosError } from 'axios';

export const isRetryableNetworkError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  if (error.code === 'ECONNABORTED') return true;
  if (!error.response) return true;
  return error.response.status >= 500;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback;

  if (error.code === 'ECONNABORTED') {
    return 'La solicitud demoro demasiado. Intenta nuevamente.';
  }

  const payload = error.response?.data;
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  if (!error.response) {
    return 'No hay conexion con el servidor. Revisa tu red e intenta nuevamente.';
  }

  if (error.response.status === 401) {
    return 'Tu sesion no es valida. Inicia sesion nuevamente.';
  }

  if (error.response.status === 403) {
    return 'No tienes permisos para esta accion.';
  }

  if (error.response.status >= 500) {
    return 'El servidor tuvo un problema temporal. Intenta en unos segundos.';
  }

  return fallback;
};
