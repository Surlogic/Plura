import api from './api';
import type { ProfessionalReservation, ReservationStatus } from '../types/professional';
import type {
  BookingActions,
  BookingCommandResponse,
  BookingFinancialSummary,
  BookingPaymentType,
} from '../types/bookings';
import { buildIdempotencyKey } from '../../../../packages/shared/src/bookings/idempotency';
import {
  type ProfessionalBookingDtoBase,
  filterActiveItems,
  mapBookingCommandResponse,
  mapProfessionalBookingBase,
  toApiReservationStatus,
} from '../../../../packages/shared/src/bookings/mappers';

type ProfessionalBookingDto = ProfessionalBookingDtoBase<
  BookingPaymentType,
  BookingFinancialSummary
>;

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

const mapBooking = (booking: ProfessionalBookingDto): ProfessionalReservation => {
  return mapProfessionalBookingBase(booking, ({ startDateTime }) => {
    const [datePart, timePart = ''] = startDateTime.split('T');
    return {
      date: datePart ?? '',
      time: timePart.slice(0, 5),
    };
  });
};

const mapCommandResponse = (
  response: BookingCommandResponse<ProfessionalBookingDto>,
) => {
  return mapBookingCommandResponse(response, mapBooking);
};

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
    { status: toApiReservationStatus(status as ReservationStatus) },
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

export const listProfessionalServices = async (): Promise<ProfessionalServiceDto[]> => {
  const response = await api.get<ProfessionalServiceDto[]>('/profesional/services');
  return filterActiveItems<ProfessionalServiceDto>(response.data);
};
