import { toByteArray } from 'base64-js';
import api from './api';

export type BackendAuthRole = 'USER' | 'PROFESSIONAL';
export type OAuthProvider = 'google' | 'apple';
export type OAuthAuthAction = 'LOGIN' | 'REGISTER';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  createdAt: string;
};

export type OAuthResponse = {
  accessToken: string | null;
  refreshToken?: string | null;
  user: AuthUser;
};

export type OAuthResult = OAuthResponse & {
  role: BackendAuthRole | null;
};

export type PasswordRecoveryVerifyPhoneResponse = {
  challengeId: string;
  expiresAt: string;
  maskedDestination: string;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const bytes = toByteArray(padded);
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
};

export const extractRoleFromAccessToken = (
  accessToken: string | null | undefined,
): BackendAuthRole | null => {
  try {
    if (!accessToken) return null;
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { role?: unknown };
    if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (payload.role === 'USER') return 'USER';
    return null;
  } catch {
    return null;
  }
};

export const oauthLoginWithAuthorizationCode = async (
  provider: OAuthProvider,
  authorizationCode: string,
  codeVerifier: string,
  redirectUri: string,
  options?: {
    desiredRole?: BackendAuthRole;
    authAction?: OAuthAuthAction;
  },
): Promise<OAuthResult> => {
  const response = await api.post<OAuthResponse>('/auth/oauth', {
    provider,
    authorizationCode,
    codeVerifier,
    redirectUri,
    desiredRole: options?.desiredRole,
    authAction: options?.authAction,
  });

  return {
    ...response.data,
    role: extractRoleFromAccessToken(response.data.accessToken),
  };
};

export const oauthLoginWithToken = async (
  provider: OAuthProvider,
  token: string,
  options?: {
    desiredRole?: BackendAuthRole;
    authAction?: OAuthAuthAction;
  },
): Promise<OAuthResult> => {
  const response = await api.post<OAuthResponse>('/auth/oauth', {
    provider,
    token,
    desiredRole: options?.desiredRole,
    authAction: options?.authAction,
  });

  return {
    ...response.data,
    role: extractRoleFromAccessToken(response.data.accessToken),
  };
};

export const completeOAuthPhone = async (phoneNumber: string) => {
  const response = await api.post<{ message: string }>('/auth/oauth/complete-phone', {
    phoneNumber,
  });
  return response.data;
};

export const startPasswordRecovery = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/password/recovery/start', {
    email,
  });
  return response.data;
};

export const verifyPasswordRecoveryPhone = async (email: string, phoneNumber: string) => {
  const response = await api.post<PasswordRecoveryVerifyPhoneResponse>(
    '/auth/password/recovery/verify-phone',
    {
      email,
      phoneNumber,
    },
  );
  return response.data;
};

export const confirmPasswordRecovery = async (payload: {
  email: string;
  phoneNumber: string;
  challengeId: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const response = await api.post<{ role?: BackendAuthRole | null }>(
    '/auth/password/recovery/confirm',
    payload,
  );
  return response.data;
};
