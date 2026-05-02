import api from './api';
import type { AuthContextType } from './authToken';

export type { AuthContextType };

export type AuthContextDescriptor = {
  type: AuthContextType;
  professionalId?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  workerId?: string | null;
  workerDisplayName?: string | null;
  owner?: boolean;
};

export type UnifiedLoginPayload = {
  email: string;
  password: string;
  desiredContext?: AuthContextType;
  desiredWorkerId?: string;
  desiredProfessionalId?: string;
};

export type UnifiedLoginResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    emailVerified?: boolean;
    phoneNumber?: string | null;
    phoneVerified?: boolean;
    createdAt: string;
  };
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
  contextSelectionRequired?: boolean;
};

export type SelectContextPayload = {
  type: AuthContextType;
  workerId?: string;
  professionalId?: string;
};

export type SelectContextResponse = {
  accessToken?: string | null;
  activeContext?: AuthContextDescriptor | null;
};

export type AuthMeResponse = {
  user: UnifiedLoginResponse['user'];
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
};

export const loginUnified = async (payload: UnifiedLoginPayload): Promise<UnifiedLoginResponse> => {
  const response = await api.post<UnifiedLoginResponse>('/auth/login', payload);
  return response.data;
};

export const selectContext = async (
  payload: SelectContextPayload,
): Promise<SelectContextResponse> => {
  const response = await api.post<SelectContextResponse>('/auth/context/select', payload);
  return response.data;
};

export const fetchAuthMe = async (): Promise<AuthMeResponse> => {
  const response = await api.get<AuthMeResponse>('/auth/me');
  return response.data;
};

export const fetchAuthContexts = async (): Promise<AuthMeResponse> => {
  const response = await api.get<AuthMeResponse>('/auth/contexts');
  return response.data;
};
