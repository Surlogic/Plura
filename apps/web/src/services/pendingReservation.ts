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

export const savePendingReservation = (pending: PendingReservation) => {
  if (!hasWindow()) return;
  const payload: PendingReservation = {
    professionalSlug: pending.professionalSlug.trim(),
    serviceId: pending.serviceId.trim(),
    date: pending.date.trim(),
    time: pending.time.trim(),
    professionalName: pending.professionalName?.trim() || undefined,
    serviceName: pending.serviceName?.trim() || undefined,
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
    if (
      typeof parsed.professionalSlug !== 'string' ||
      typeof parsed.serviceId !== 'string' ||
      typeof parsed.date !== 'string' ||
      typeof parsed.time !== 'string'
    ) {
      return null;
    }
    const pending: PendingReservation = {
      professionalSlug: parsed.professionalSlug.trim(),
      serviceId: parsed.serviceId.trim(),
      date: parsed.date.trim(),
      time: parsed.time.trim(),
      professionalName:
        typeof parsed.professionalName === 'string' && parsed.professionalName.trim()
          ? parsed.professionalName.trim()
          : undefined,
      serviceName:
        typeof parsed.serviceName === 'string' && parsed.serviceName.trim()
          ? parsed.serviceName.trim()
          : undefined,
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
