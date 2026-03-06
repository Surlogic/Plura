import api from './api';

export type OAuthProvider = 'google' | 'apple';

type OAuthAuthorizationCodePayload = {
  provider: OAuthProvider;
  authorizationCode: string;
  codeVerifier: string;
  redirectUri: string;
};

type OAuthTokenPayload = {
  provider: OAuthProvider;
  token: string;
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
): Promise<OAuthResponse> => {
  const payload: OAuthAuthorizationCodePayload = {
    provider,
    authorizationCode,
    codeVerifier,
    redirectUri,
  };

  const response = await api.post<OAuthResponse>('/auth/oauth', payload);
  return response.data;
};

export const oauthLoginWithToken = async (
  provider: OAuthProvider,
  token: string,
): Promise<OAuthResponse> => {
  const payload: OAuthTokenPayload = { provider, token };
  const response = await api.post<OAuthResponse>('/auth/oauth', payload);
  return response.data;
};
