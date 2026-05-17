import api from '@/services/api';
import {
  setAuthAccessToken,
  setKnownAuthSessionRole,
  type KnownAuthSessionRole,
} from '@/services/session';

export type AuthContextType = 'CLIENT' | 'PROFESSIONAL' | 'WORKER';

export type AuthContextDescriptor = {
  type: AuthContextType;
  professionalId?: string | null;
  professionalName?: string | null;
  professionalSlug?: string | null;
  workerId?: string | null;
  workerDisplayName?: string | null;
  owner?: boolean;
};

export type AuthMeResponse = {
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string | null;
  } | null;
  activeContext?: AuthContextDescriptor | null;
  contexts?: AuthContextDescriptor[];
};

export type UnifiedLoginResponse = AuthMeResponse & {
  accessToken?: string | null;
  refreshToken?: string | null;
  contextSelectionRequired?: boolean;
};

export type SelectContextResponse = {
  accessToken?: string | null;
  activeContext?: AuthContextDescriptor | null;
};

export type ActivateProfessionalProfileRequest = {
  rubro?: string | null;
  categorySlugs?: string[];
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tipoCliente: 'LOCAL' | 'A_DOMICILIO' | 'SIN_LOCAL';
};

export const sessionRoleForContext = (type?: AuthContextType | null): KnownAuthSessionRole => {
  switch (type) {
    case 'PROFESSIONAL':
      return 'PROFESSIONAL';
    case 'WORKER':
      return 'WORKER';
    default:
      return 'CLIENT';
  }
};

export const hasContext = (
  contexts: AuthContextDescriptor[] | undefined | null,
  type: AuthContextType,
) => Array.isArray(contexts) && contexts.some((context) => context.type === type);

export const persistAccessTokenForContext = (
  accessToken?: string | null,
  context?: AuthContextDescriptor | null,
) => {
  const role = sessionRoleForContext(context?.type);
  if (accessToken) {
    setAuthAccessToken(accessToken, role);
  } else {
    setKnownAuthSessionRole(role);
  }
};

export const fetchAuthMe = async (): Promise<AuthMeResponse> => {
  const response = await api.get<AuthMeResponse>('/auth/me');
  return response.data ?? {};
};

export const selectAuthContext = async (
  descriptorOrType: AuthContextDescriptor | AuthContextType,
): Promise<AuthContextDescriptor> => {
  const descriptor = typeof descriptorOrType === 'string'
    ? { type: descriptorOrType }
    : descriptorOrType;
  const response = await api.post<SelectContextResponse>('/auth/context/select', {
    type: descriptor.type,
    workerId: descriptor.workerId ?? undefined,
    professionalId: descriptor.professionalId ?? undefined,
  });
  const active = response.data?.activeContext ?? descriptor;
  persistAccessTokenForContext(response.data?.accessToken, active);
  return active;
};

export const ensureAuthContext = async (
  type: AuthContextType,
): Promise<AuthContextDescriptor> => {
  const me = await fetchAuthMe();
  if (me.activeContext?.type === type) {
    setKnownAuthSessionRole(sessionRoleForContext(type));
    return me.activeContext;
  }
  const descriptor = me.contexts?.find((context) => context.type === type);
  if (!descriptor) {
    throw new Error(`AUTH_CONTEXT_${type}_UNAVAILABLE`);
  }
  return selectAuthContext(descriptor);
};

export const activateProfessionalProfile = async (
  payload: ActivateProfessionalProfileRequest,
): Promise<AuthMeResponse> => {
  const response = await api.post<AuthMeResponse>('/auth/professional-profile/activate', payload);
  return response.data ?? {};
};
