import api from './api';

export type InvitationLookup = {
  email: string;
  displayName: string;
  professionalId: string | null;
  professionalName: string | null;
  expiresAt: string | null;
  needsAccountCreation: boolean;
};

export type InvitationAcceptPayload = {
  token: string;
  fullName?: string;
  phoneNumber?: string;
  password?: string;
};

export type InvitationAcceptResponse = {
  email: string;
  displayName: string;
  professionalId: string | null;
  professionalName: string | null;
  accountCreated: boolean;
};

export const lookupWorkerInvitation = async (token: string): Promise<InvitationLookup> => {
  const response = await api.get<InvitationLookup>('/auth/worker-invitations', {
    params: { token },
  });
  return response.data;
};

export const acceptWorkerInvitation = async (
  payload: InvitationAcceptPayload,
): Promise<InvitationAcceptResponse> => {
  const response = await api.post<InvitationAcceptResponse>(
    '/auth/worker-invitations/accept',
    payload,
  );
  return response.data;
};
