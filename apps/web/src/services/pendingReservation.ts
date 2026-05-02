'use client';

export type PendingReservation = {
  professionalSlug: string;
  serviceId: string;
  date: string;
  time: string;
  professionalName?: string;
  serviceName?: string;
};

const PENDING_RESERVATION_KEY = 'pendingReservation';

const hasWindow = () => typeof window !== 'undefined';

const normalizeStorageString = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).trim();
  }
  return '';
};

export const savePendingReservation = (pending: PendingReservation) => {
  if (!hasWindow()) return;
  const payload: PendingReservation = {
    professionalSlug: normalizeStorageString(pending.professionalSlug),
    serviceId: normalizeStorageString(pending.serviceId),
    date: normalizeStorageString(pending.date),
    time: normalizeStorageString(pending.time),
    professionalName: normalizeStorageString(pending.professionalName) || undefined,
    serviceName: normalizeStorageString(pending.serviceName) || undefined,
  };
  if (!payload.professionalSlug || !payload.serviceId || !payload.date || !payload.time) {
    return;
  }
  window.localStorage.setItem(PENDING_RESERVATION_KEY, JSON.stringify(payload));
};

export const getPendingReservation = (): PendingReservation | null => {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(PENDING_RESERVATION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingReservation>;
    const pending: PendingReservation = {
      professionalSlug: normalizeStorageString(parsed.professionalSlug),
      serviceId: normalizeStorageString(parsed.serviceId),
      date: normalizeStorageString(parsed.date),
      time: normalizeStorageString(parsed.time),
      professionalName: normalizeStorageString(parsed.professionalName) || undefined,
      serviceName: normalizeStorageString(parsed.serviceName) || undefined,
    };
    if (!pending.professionalSlug || !pending.serviceId || !pending.date || !pending.time) {
      return null;
    }
    return pending;
  } catch {
    return null;
  }
};

export const clearPendingReservation = () => {
  if (!hasWindow()) return;
  window.localStorage.removeItem(PENDING_RESERVATION_KEY);
};
