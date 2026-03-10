import api from './api';
import type { ProfessionalReservation, ReservationStatus } from '../types/professional';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialSummary,
  BookingPaymentType,
} from '../types/bookings';

type ApiReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

type ProfessionalBookingDto = {
  id: number;
  userId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  startDateTime: string;
  timezone?: string | null;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  paymentType?: BookingPaymentType | null;
  financialSummary?: BookingFinancialSummary | null;
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
    case 'NO_SHOW':
      return 'no_show';
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
    case 'no_show':
      return 'NO_SHOW';
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
    paymentType: booking.paymentType || null,
    financialSummary: booking.financialSummary || null,
  };
};

const mapCommandResponse = (
  response: BookingCommandResponse<ProfessionalBookingDto>,
) => {
  const booking = response.booking ? mapBooking(response.booking) : null;
  return {
    ...response,
    booking,
  };
};

const buildIdempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getProfessionalReservationsByRange = async (
  dateFrom: string,
  dateTo: string,
): Promise<ProfessionalReservation[]> => {
  const response = await api.get<ProfessionalBookingDto[]>('/profesional/reservas', {
    params: { dateFrom, dateTo },
  });

  const bookings = Array.isArray(response.data) ? response.data : [];
  return bookings.map(mapBooking);
};

export const updateProfessionalReservationStatus = async (
  id: string,
  status: ReservationStatus,
): Promise<ProfessionalReservation> => {
  const response = await api.put<ProfessionalBookingDto>(
    `/profesional/reservas/${id}`,
    { status: toApiStatus(status) },
  );
  return mapBooking(response.data);
};

export const createProfessionalReservation = async (
  payload: ProfessionalBookingCreatePayload,
): Promise<ProfessionalReservation> => {
  const response = await api.post<ProfessionalBookingDto>('/profesional/reservas', payload);
  return mapBooking(response.data);
};

export const getProfessionalBookingActions = async (bookingId: string) => {
  const response = await api.get<BookingActions>(`/reservas/${bookingId}/actions`);
  return response.data;
};

export const cancelProfessionalBooking = async (
  bookingId: string,
  reason?: string,
) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/cancel`,
    reason?.trim() ? { reason: reason.trim() } : {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-cancel-${bookingId}`),
      },
    },
  );
  return mapCommandResponse(response.data);
};

export const rescheduleProfessionalBooking = async (
  bookingId: string,
  startDateTime: string,
  timezone?: string,
) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/reschedule`,
    {
      startDateTime,
      timezone: timezone?.trim() || undefined,
    },
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-reschedule-${bookingId}`),
      },
    },
  );
  return mapCommandResponse(response.data);
};

export const markProfessionalBookingNoShow = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/no-show`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-no-show-${bookingId}`),
      },
    },
  );
  return mapCommandResponse(response.data);
};

export const completeProfessionalBooking = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/complete`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-complete-${bookingId}`),
      },
    },
  );
  return mapCommandResponse(response.data);
};

export const retryProfessionalBookingPayout = async (bookingId: string) => {
  const response = await api.post<BookingCommandResponse<ProfessionalBookingDto>>(
    `/profesional/reservas/${bookingId}/payout/retry`,
    {},
    {
      headers: {
        'Idempotency-Key': buildIdempotencyKey(`professional-retry-payout-${bookingId}`),
      },
    },
  );
  return mapCommandResponse(response.data);
};

export const listProfessionalServices = async (): Promise<ProfessionalServiceDto[]> => {
  const response = await api.get<ProfessionalServiceDto[]>('/profesional/services');
  const services = Array.isArray(response.data) ? response.data : [];
  return services.filter((service) => service?.active !== false);
};
