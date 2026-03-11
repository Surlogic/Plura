import api from './api';
import type { ServicePaymentType } from '../types/professional';
import {
  type PublicBookingRequest,
  type PublicBookingResponseBase,
  type PublicBookingStatus,
  type PublicProfessionalPageBase,
  type PublicProfessionalServiceBase,
  type PublicProfessionalSummary,
  normalizePublicProfessionalPage,
  normalizePublicProfessionalSummaries,
  normalizePublicSlots,
} from '../../../../packages/shared/src/publicBookings/contracts';

export type PublicProfessionalService = PublicProfessionalServiceBase<ServicePaymentType>;

export type PublicProfessionalPage = PublicProfessionalPageBase<ServicePaymentType>;

export type {
  PublicBookingStatus,
  PublicBookingRequest,
  PublicProfessionalSummary,
};

export type PublicBookingResponse = PublicBookingResponseBase;

export const listPublicProfessionals = async (): Promise<PublicProfessionalSummary[]> => {
  const response = await api.get<PublicProfessionalSummary[]>('/public/profesionales', {
    params: { size: 50 },
  });

  return normalizePublicProfessionalSummaries(response.data);
};

export const getPublicProfessionalBySlug = async (
  slug: string,
): Promise<PublicProfessionalPage> => {
  const response = await api.get<PublicProfessionalPage>(`/public/profesionales/${slug}`);
  return normalizePublicProfessionalPage(response.data);
};

export const getPublicSlots = async (
  slug: string,
  date: string,
  serviceId: string,
): Promise<string[]> => {
  const response = await api.get<string[]>(`/public/profesionales/${slug}/slots`, {
    params: { date, serviceId },
  });

  return normalizePublicSlots(response.data);
};

export const createPublicReservation = async (
  slug: string,
  payload: PublicBookingRequest,
): Promise<PublicBookingResponse> => {
  const response = await api.post<PublicBookingResponse>(`/public/profesionales/${slug}/reservas`, payload);
  return response.data;
};
