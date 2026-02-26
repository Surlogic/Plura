import api from '@/services/api';
import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';

type ApiReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

type ProfessionalBookingDto = {
  id: number;
  userId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  startDateTime: string;
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
    status: toFrontendStatus(booking.status),
    serviceId: booking.serviceId,
    userId: booking.userId,
  };
};

export const getProfessionalReservationsByDate = async (
  date: string,
): Promise<ProfessionalReservation[]> => {
  const response = await api.get<ProfessionalBookingDto[]>('/profesional/reservas', {
    params: { date },
  });
  return response.data.map(mapBooking);
};

export const getProfessionalReservationsForDates = async (
  dates: string[],
): Promise<ProfessionalReservation[]> => {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
  if (uniqueDates.length === 0) return [];

  const responses = await Promise.all(
    uniqueDates.map((date) => getProfessionalReservationsByDate(date)),
  );

  const reservationsById = new Map<string, ProfessionalReservation>();
  responses.flat().forEach((reservation) => {
    reservationsById.set(reservation.id, reservation);
  });

  return Array.from(reservationsById.values()).sort((a, b) => {
    const aDateTime = `${a.date}T${a.time || '00:00'}`;
    const bDateTime = `${b.date}T${b.time || '00:00'}`;
    return aDateTime.localeCompare(bDateTime);
  });
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
