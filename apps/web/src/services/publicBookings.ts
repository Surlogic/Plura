import api from '@/services/api';
import type { ProfessionalSchedule } from '@/types/professional';

export type PublicProfessionalService = {
  id: string;
  name: string;
  price?: string;
  duration?: string;
};

export type PublicProfessionalPage = {
  id: string;
  slug: string;
  fullName: string;
  location?: string | null;
  schedule?: ProfessionalSchedule;
  services: PublicProfessionalService[];
};

export type PublicBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

type PublicBookingRequest = {
  serviceId: string;
  startDateTime: string;
};

type PublicBookingResponse = {
  id: number;
  status: PublicBookingStatus;
  startDateTime: string;
  serviceId: string;
  professionalId: string;
  userId: string;
};

export const getPublicProfessionalBySlug = async (
  slug: string,
): Promise<PublicProfessionalPage> => {
  const response = await api.get<PublicProfessionalPage>(`/public/profesionales/${slug}`);
  return {
    ...response.data,
    services: Array.isArray(response.data.services) ? response.data.services : [],
  };
};

export const getPublicSlots = async (
  slug: string,
  date: string,
  serviceId: string,
): Promise<string[]> => {
  const response = await api.get<string[]>(`/public/profesionales/${slug}/slots`, {
    params: { date, serviceId },
  });
  return Array.isArray(response.data) ? response.data : [];
};

export const createPublicReservation = async (
  slug: string,
  payload: PublicBookingRequest,
): Promise<PublicBookingResponse> => {
  const response = await api.post<PublicBookingResponse>(
    `/public/profesionales/${slug}/reservas`,
    payload,
  );
  return response.data;
};
