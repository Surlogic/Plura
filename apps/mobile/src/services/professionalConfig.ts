import api from './api';
import type {
  BookingProcessingFeeMode,
  ProfessionalSchedule,
  ProfessionalService,
  ServiceCategoryOption,
} from '../types/professional';

export type ProfessionalBusinessProfile = {
  fullName: string;
  rubro: string;
  categorySlugs: string[];
  location: string;
  country: string;
  city: string;
  fullAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber: string;
  logoUrl?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  whatsapp?: string;
};

export type ProfessionalPublicPagePayload = {
  headline?: string;
  about?: string;
};

export type ServicePayload = {
  name: string;
  description: string;
  categorySlug?: string | null;
  imageUrl: string;
  price: string;
  depositAmount?: string | null;
  duration: string;
  postBufferMinutes: number;
  paymentType: 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY';
  processingFeeMode: BookingProcessingFeeMode;
  active: boolean;
};

export const updateProfessionalBusinessProfile = async (
  payload: ProfessionalBusinessProfile,
): Promise<void> => {
  await api.put('/profesional/profile', payload);
};

export const updateProfessionalPublicPage = async (
  payload: ProfessionalPublicPagePayload,
): Promise<void> => {
  await api.put('/profesional/public-page', payload);
};

export const getProfessionalSchedule = async (): Promise<ProfessionalSchedule> => {
  const response = await api.get<ProfessionalSchedule>('/profesional/schedule');
  return response.data;
};

export const updateProfessionalSchedule = async (
  payload: ProfessionalSchedule,
): Promise<ProfessionalSchedule> => {
  const response = await api.put<ProfessionalSchedule>('/profesional/schedule', payload);
  return response.data;
};

export const listProfessionalServices = async (): Promise<ProfessionalService[]> => {
  const response = await api.get<ProfessionalService[]>('/profesional/services');
  return Array.isArray(response.data) ? response.data : [];
};

export const listServiceCategories = async (): Promise<ServiceCategoryOption[]> => {
  const response = await api.get<ServiceCategoryOption[]>('/categories');
  return Array.isArray(response.data) ? response.data : [];
};

export const createProfessionalService = async (
  payload: ServicePayload,
): Promise<ProfessionalService> => {
  const response = await api.post<ProfessionalService>('/profesional/services', payload);
  return response.data;
};

export const updateProfessionalService = async (
  id: string,
  payload: ServicePayload,
): Promise<ProfessionalService> => {
  const response = await api.put<ProfessionalService>(`/profesional/services/${id}`, payload);
  return response.data;
};

export const deleteProfessionalService = async (id: string): Promise<void> => {
  await api.delete(`/profesional/services/${id}`);
};
