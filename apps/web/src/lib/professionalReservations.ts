import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';

const buildStorageKey = (professionalId: string) =>
  `plura:reservations:${professionalId}`;

const normalizeStatus = (value?: string): ReservationStatus => {
  switch (value) {
    case 'pending':
    case 'completed':
    case 'cancelled':
    case 'confirmed':
      return value;
    default:
      return 'confirmed';
  }
};

const normalizeReservations = (value: unknown): ProfessionalReservation[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const safeItem = item as Partial<ProfessionalReservation>;
      return {
        id: safeItem.id || `reservation-${Date.now()}-${index}`,
        serviceName: safeItem.serviceName || '',
        clientName: safeItem.clientName || '',
        date: safeItem.date || '',
        time: safeItem.time || '',
        price: safeItem.price || '',
        duration: safeItem.duration || '',
        status: normalizeStatus(safeItem.status),
        notes: safeItem.notes || '',
      };
    })
    .filter((item) => item.date);
};

export const loadProfessionalReservations = (
  professionalId?: string | null,
): ProfessionalReservation[] => {
  if (!professionalId) return [];
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(buildStorageKey(professionalId));
  if (!raw) return [];
  try {
    return normalizeReservations(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveProfessionalReservations = (
  professionalId: string,
  reservations: ProfessionalReservation[],
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    buildStorageKey(professionalId),
    JSON.stringify(reservations),
  );
};
