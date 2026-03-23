import api from '@/services/api';
import type { AppFeedbackResponse, CreateAppFeedbackRequest, AppFeedbackPage } from '@/types/appFeedback';

export const createClientAppFeedback = async (
  request: CreateAppFeedbackRequest,
): Promise<AppFeedbackResponse> => {
  const response = await api.post<AppFeedbackResponse>('/cliente/app-feedback', request);
  return response.data;
};

export const createProfessionalAppFeedback = async (
  request: CreateAppFeedbackRequest,
): Promise<AppFeedbackResponse> => {
  const response = await api.post<AppFeedbackResponse>('/profesional/app-feedback', request);
  return response.data;
};

export const getClientAppFeedbackMine = async (
  page = 0,
  size = 10,
): Promise<AppFeedbackPage> => {
  const response = await api.get<AppFeedbackPage>('/cliente/app-feedback/mine', {
    params: { page, size },
  });
  return response.data;
};

export const getProfessionalAppFeedbackMine = async (
  page = 0,
  size = 10,
): Promise<AppFeedbackPage> => {
  const response = await api.get<AppFeedbackPage>('/profesional/app-feedback/mine', {
    params: { page, size },
  });
  return response.data;
};
