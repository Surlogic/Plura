import { getJsonItem, setJsonItem } from './storage';

export type PendingReservation = {
  professionalSlug: string;
  serviceId: string;
  date: string;
  time: string;
};

const PENDING_RESERVATION_KEY = 'plura_pending_reservation';

export const savePendingReservation = async (pending: PendingReservation) => {
  const payload: PendingReservation = {
    professionalSlug: pending.professionalSlug.trim(),
    serviceId: pending.serviceId.trim(),
    date: pending.date.trim(),
    time: pending.time.trim(),
  };

  if (!payload.professionalSlug || !payload.serviceId || !payload.date || !payload.time) {
    return;
  }

  await setJsonItem(PENDING_RESERVATION_KEY, payload);
};

export const getPendingReservation = async (): Promise<PendingReservation | null> => {
  const pending = await getJsonItem<PendingReservation | null>(PENDING_RESERVATION_KEY, null);
  if (!pending) return null;

  if (!pending.professionalSlug || !pending.serviceId || !pending.date || !pending.time) {
    return null;
  }

  return pending;
};

export const clearPendingReservation = async () => {
  await setJsonItem(PENDING_RESERVATION_KEY, null);
};
