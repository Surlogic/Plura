import api from '@/services/api';
import { cachedGet } from '@/services/cachedGet';
import type { ProfessionalSchedule } from '@/types/professional';
import type { Category } from '@/types/category';

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
  logoUrl?: string | null;
  categories?: Category[];
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

const PUBLIC_PROFILE_TIMEOUT_MS = 10000;
const PUBLIC_SLOTS_TIMEOUT_MS = 10000;
const PUBLIC_BOOKING_TIMEOUT_MS = 15000;

export const getPublicProfessionalBySlug = async (
  slug: string,
): Promise<PublicProfessionalPage> => {
  const response = await cachedGet<PublicProfessionalPage>(
    `/public/profesionales/${slug}`,
    {
      timeout: PUBLIC_PROFILE_TIMEOUT_MS,
    },
    {
      ttlMs: 45000,
      staleWhileRevalidate: true,
    },
  );
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
  const response = await cachedGet<string[]>(
    `/public/profesionales/${slug}/slots`,
    {
      params: { date, serviceId },
      timeout: PUBLIC_SLOTS_TIMEOUT_MS,
    },
    {
      ttlMs: 10000,
    },
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const createPublicReservation = async (
  slug: string,
  payload: PublicBookingRequest,
): Promise<PublicBookingResponse> => {
  const response = await api.post<PublicBookingResponse>(
    `/public/profesionales/${slug}/reservas`,
    payload,
    {
      timeout: PUBLIC_BOOKING_TIMEOUT_MS,
      timeoutErrorMessage: 'Reservation request timed out',
    },
  );
  return response.data;
};
