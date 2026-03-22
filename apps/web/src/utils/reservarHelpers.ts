import { isAxiosError } from 'axios';
import type { WorkDayKey } from '@/types/professional';
export type { WorkDayKey } from '@/types/professional';

export const dayLabelsShort: Record<WorkDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mie',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sab',
  sun: 'Dom',
};

export const dayKeyByIndex: Record<number, WorkDayKey> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

export const weekOrder: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAYS_AHEAD = 28;

export const RESERVATION_ERROR_FALLBACK = 'No se pudo crear la reserva. Intenta nuevamente.';
export const RESERVATION_TIMEOUT_ERROR =
  'La solicitud tardó demasiado. Intenta nuevamente.';
export const RESERVATION_LOGIN_REDIRECT = '/login?redirect=confirm-reservation';

export const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

export const resolveQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

export const parseDurationToMinutes = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const numbers = trimmed.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  if (trimmed.includes('h')) {
    const hours = numbers[0] ?? 0;
    const minutes = numbers.length > 1 ? numbers[1] : 0;
    return hours * 60 + minutes;
  }
  return numbers[0];
};

export const formatDuration = (value?: string) => {
  const minutes = parseDurationToMinutes(value);
  if (!minutes) return 'Duracion estimada 45 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
};

export const formatPrice = (value?: string) => {
  if (!value) return 'A confirmar';
  const trimmed = value.trim();
  if (!trimmed) return 'A confirmar';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}`;
};

export const splitLocationLines = (location: string) => {
  const normalized = location.trim();
  if (!normalized) {
    return { addressLine: '', cityLine: '' };
  }
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { addressLine: '', cityLine: '' };
  }
  if (parts.length === 1) {
    return { addressLine: parts[0], cityLine: '' };
  }
  return {
    addressLine: parts[0],
    cityLine: parts.slice(1).join(', '),
  };
};

export const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return fallback;
    }
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
      const errorMessage = (responseData as { error?: unknown }).error;
      if (typeof errorMessage === 'string' && errorMessage.trim()) {
        return errorMessage.trim();
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

export const isReservationTimeoutError = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  if (error.code === 'ECONNABORTED') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('timeout') || message.includes('timed out');
};
