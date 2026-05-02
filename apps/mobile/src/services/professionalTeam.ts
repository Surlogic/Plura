import api from './api';

export type WorkerStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export type ProfessionalWorker = {
  id: string;
  professionalId?: string;
  userId?: string | null;
  email: string;
  displayName: string;
  status: WorkerStatus;
  owner: boolean;
  serviceIds?: string[];
  acceptedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProfessionalServiceSummary = {
  id: string;
  name: string;
  active?: boolean;
};

export type WorkerInviteResponse = {
  worker: ProfessionalWorker;
  emailDelivery?: { status: string } | null;
};

export const fetchTeam = async (): Promise<ProfessionalWorker[]> => {
  const response = await api.get<ProfessionalWorker[]>('/profesional/team');
  return Array.isArray(response.data) ? response.data : [];
};

export const inviteWorker = async (payload: {
  email: string;
  displayName?: string;
  serviceIds?: string[];
}): Promise<WorkerInviteResponse> => {
  const response = await api.post<WorkerInviteResponse>('/profesional/team/invitations', payload);
  return response.data;
};

export const updateWorker = async (
  workerId: string,
  payload: { displayName?: string; status?: WorkerStatus },
): Promise<ProfessionalWorker> => {
  const response = await api.patch<ProfessionalWorker>(`/profesional/team/${workerId}`, payload);
  return response.data;
};

export const updateWorkerServices = async (
  workerId: string,
  serviceIds: string[],
): Promise<ProfessionalWorker> => {
  const response = await api.put<ProfessionalWorker>(
    `/profesional/team/${workerId}/services`,
    { serviceIds },
  );
  return response.data;
};

export const fetchProfessionalServices = async (): Promise<ProfessionalServiceSummary[]> => {
  const response = await api.get<ProfessionalServiceSummary[]>('/profesional/services');
  return Array.isArray(response.data) ? response.data : [];
};
