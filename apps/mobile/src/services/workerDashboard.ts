import api from './api';

export type WorkerSummary = {
  workerId: string;
  displayName: string;
  email: string;
  status: string;
  professionalId?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
};

export type WorkerBooking = {
  id: number;
  userId: number;
  userFullName: string;
  serviceId: string;
  serviceNameSnapshot: string;
  startDateTime: string;
  timezone: string;
  serviceDurationSnapshot: string;
  servicePostBufferMinutesSnapshot: number;
  servicePaymentTypeSnapshot: string;
  rescheduleCount: number;
  operationalStatus: string;
};

export const fetchWorkerSummary = async (): Promise<WorkerSummary> => {
  const response = await api.get<WorkerSummary>('/trabajador/me');
  return response.data;
};

export const fetchWorkerCalendar = async (params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<WorkerBooking[]> => {
  const response = await api.get<WorkerBooking[]>('/trabajador/calendario', {
    params,
  });
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchWorkerBookings = async (params?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<WorkerBooking[]> => {
  const response = await api.get<WorkerBooking[]>('/trabajador/reservas', {
    params,
  });
  return Array.isArray(response.data) ? response.data : [];
};
