import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';

type ApiReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

type ProfessionalBookingDto = {
  id: number;
  userId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  startDateTime: string;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  status: ApiReservationStatus;
};

type ProfessionalBookingCreatePayload = {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceId: string;
  startDateTime: string;
};

type ProfessionalServiceDto = {
  id: string;
  name: string;
  active?: boolean;
};

const toFrontendStatus = (status: ApiReservationStatus): ReservationStatus => {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'CONFIRMED':
      return 'confirmed';
    case 'CANCELLED':
      return 'cancelled';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'pending';
  }
};

const toApiStatus = (status: ReservationStatus): ApiReservationStatus => {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
      return 'CANCELLED';
    case 'completed':
      return 'COMPLETED';
    default:
      return 'PENDING';
  }
};

const mapBooking = (booking: ProfessionalBookingDto): ProfessionalReservation => {
  const [datePart, timePart = ''] = booking.startDateTime.split('T');
  return {
    id: String(booking.id),
    serviceName: booking.serviceName,
    clientName: booking.clientName,
    date: datePart ?? '',
    time: timePart.slice(0, 5),
    duration: booking.duration,
    postBufferMinutes: booking.postBufferMinutes ?? 0,
    effectiveDurationMinutes: booking.effectiveDurationMinutes,
    status: toFrontendStatus(booking.status),
    serviceId: booking.serviceId,
    userId: booking.userId,
  };
};

export const getProfessionalReservationsByDate = async (
  date: string,
): Promise<ProfessionalReservation[]> => {
  return getProfessionalReservationsByRange(date, date);
};

export const getProfessionalReservationsByRange = async (
  dateFrom: string,
  dateTo: string,
): Promise<ProfessionalReservation[]> => {
  const response = await cachedGet<ProfessionalBookingDto[]>(
    '/profesional/reservas',
    {
      params: { dateFrom, dateTo },
    },
    {
      ttlMs: 8000,
      staleWhileRevalidate: true,
    },
  );
  return response.data.map(mapBooking);
};

export const getProfessionalReservationsForDates = async (dates: string[]): Promise<ProfessionalReservation[]> => {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
  if (uniqueDates.length === 0) return [];
  const dateFrom = uniqueDates[0];
  const dateTo = uniqueDates[uniqueDates.length - 1];
  return getProfessionalReservationsByRange(dateFrom, dateTo);
};

export const updateProfessionalReservationStatus = async (
  id: string,
  status: ReservationStatus,
): Promise<ProfessionalReservation> => {
  const response = await api.put<ProfessionalBookingDto>(
    `/profesional/reservas/${id}`,
    { status: toApiStatus(status) },
  );
  invalidateCachedGet('/profesional/reservas');
  return mapBooking(response.data);
};

export const createProfessionalReservation = async (
  payload: ProfessionalBookingCreatePayload,
): Promise<ProfessionalReservation> => {
  const response = await api.post<ProfessionalBookingDto>('/profesional/reservas', payload);
  invalidateCachedGet('/profesional/reservas');
  return mapBooking(response.data);
};

export const listProfessionalServices = async (): Promise<ProfessionalServiceDto[]> => {
  const response = await cachedGet<ProfessionalServiceDto[]>(
    '/profesional/services',
    undefined,
    {
      ttlMs: 15000,
      staleWhileRevalidate: true,
    },
  );
  const services = Array.isArray(response.data) ? response.data : [];
  return services.filter((service) => service?.active !== false);
};
