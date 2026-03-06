import api from './api';

export type PublicProfessionalService = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  duration?: string;
  postBufferMinutes?: number;
};

export type PublicProfessionalPage = {
  id: string;
  slug: string;
  name?: string;
  fullName: string;
  rubro?: string;
  description?: string | null;
  headline?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  services: PublicProfessionalService[];
};

export type PublicProfessionalSummary = {
  id: string;
  slug: string;
  fullName: string;
  rubro?: string;
  location?: string;
  headline?: string;
};

type PublicBookingRequest = {
  serviceId: string;
  startDateTime: string;
};

type PublicBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type PublicBookingResponse = {
  id: number;
  status: PublicBookingStatus;
  startDateTime: string;
  serviceId: string;
  professionalId: string;
  userId: string;
};

export const listPublicProfessionals = async (): Promise<PublicProfessionalSummary[]> => {
  const response = await api.get<PublicProfessionalSummary[]>('/public/profesionales', {
    params: { size: 50 },
  });

  return Array.isArray(response.data) ? response.data : [];
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
  const response = await api.post<PublicBookingResponse>(`/public/profesionales/${slug}/reservas`, payload);
  return response.data;
};
