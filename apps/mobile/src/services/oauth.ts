import api from './api';

export type OAuthProvider = 'google' | 'apple';
export type OAuthAuthAction = 'LOGIN' | 'REGISTER';

type OAuthAuthorizationCodePayload = {
  provider: OAuthProvider;
  authorizationCode: string;
  codeVerifier: string;
  redirectUri: string;
  desiredRole?: 'USER' | 'PROFESSIONAL';
  authAction?: OAuthAuthAction;
};

type OAuthTokenPayload = {
  provider: OAuthProvider;
  token: string;
  desiredRole?: 'USER' | 'PROFESSIONAL';
  authAction?: OAuthAuthAction;
};

type OAuthResponse = {
  accessToken: string | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
  };
};

export const oauthLoginWithAuthorizationCode = async (
  provider: OAuthProvider,
  authorizationCode: string,
  codeVerifier: string,
  redirectUri: string,
  options?: {
    desiredRole?: 'USER' | 'PROFESSIONAL';
    authAction?: OAuthAuthAction;
  },
): Promise<OAuthResponse> => {
  const payload: OAuthAuthorizationCodePayload = {
    provider,
    authorizationCode,
    codeVerifier,
    redirectUri,
    desiredRole: options?.desiredRole,
    authAction: options?.authAction,
  };

  const response = await api.post<OAuthResponse>('/auth/oauth', payload);
  return response.data;
};

export const oauthLoginWithToken = async (
  provider: OAuthProvider,
  token: string,
  options?: {
    desiredRole?: 'USER' | 'PROFESSIONAL';
    authAction?: OAuthAuthAction;
  },
): Promise<OAuthResponse> => {
  const payload: OAuthTokenPayload = {
    provider,
    token,
    desiredRole: options?.desiredRole,
    authAction: options?.authAction,
  };
  const response = await api.post<OAuthResponse>('/auth/oauth', payload);
  return response.data;
};
