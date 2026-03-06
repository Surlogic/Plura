import api from './api';
import type { ProfessionalReservation, ReservationStatus } from '../types/professional';

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

const mapBooking = (booking: ProfessionalBookingDto): ProfessionalReservation => {
  const [datePart, timePart = ''] = booking.startDateTime.split('T');
  return {
    id: String(booking.id),
    serviceName: booking.serviceName,
    clientName: booking.clientName,
    date: datePart ?? '',
    time: timePart.slice(0, 5),
    duration: booking.duration,
    status: toFrontendStatus(booking.status),
  };
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
