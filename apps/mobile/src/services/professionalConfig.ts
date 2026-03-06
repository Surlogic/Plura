import api from './api';
import type { ProfessionalSchedule, ProfessionalService } from '../types/professional';

export type ProfessionalBusinessProfile = {
  fullName: string;
  rubro: string;
  location: string;
  country: string;
  city: string;
  fullAddress: string;
  phoneNumber: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  whatsapp?: string;
  headline?: string;
  about?: string;
};

export type ServicePayload = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  duration: string;
  postBufferMinutes: number;
  active: boolean;
};

export const updateProfessionalBusinessProfile = async (
  payload: ProfessionalBusinessProfile,
): Promise<void> => {
  await api.put('/profesional/profile', payload);
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
