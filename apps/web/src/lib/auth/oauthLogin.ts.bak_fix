import api from '@/services/api';
import { setAuthAccessToken } from '@/services/session';

export type OAuthProvider = 'google' | 'apple';
export type OAuthRole = 'USER' | 'PROFESSIONAL' | null;
export type OAuthDesiredRole = Exclude<OAuthRole, null>;
export type OAuthAuthAction = 'LOGIN' | 'REGISTER';

type OAuthUser = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
};

type OAuthResponse = {
  accessToken: string | null;
  user: OAuthUser;
};

export type OAuthLoginResult = OAuthResponse & {
  role: OAuthRole;
};

type OAuthIntentOptions = {
  intendedRole?: OAuthDesiredRole;
  authAction?: OAuthAuthAction;
};

type OAuthAuthorizationCodeOptions = OAuthIntentOptions & {
  grantType: 'authorization_code';
  codeVerifier: string;
  redirectUri: string;
};

type OAuthTokenOptions = OAuthIntentOptions & {
  grantType?: 'token';
};

type OAuthLoginOptions = OAuthTokenOptions | OAuthAuthorizationCodeOptions;

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

const extractRoleFromAccessToken = (accessToken: string | null | undefined): OAuthRole => {
  try {
    if (!accessToken) return null;
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw) as { role?: unknown };
    if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (payload.role === 'USER') return 'USER';
    return null;
  } catch {
    return null;
  }
};

export async function oauthLogin(
  provider: OAuthProvider,
  tokenOrCode: string,
  options: OAuthLoginOptions = { grantType: 'token' },
): Promise<OAuthLoginResult> {
  const payload =
    options.grantType === 'authorization_code'
      ? {
          provider,
          authorizationCode: tokenOrCode,
          codeVerifier: options.codeVerifier,
          redirectUri: options.redirectUri,
          desiredRole: options.intendedRole,
          authAction: options.authAction,
        }
      : {
          provider,
          token: tokenOrCode,
          desiredRole: options.intendedRole,
          authAction: options.authAction,
        };

  const response = await api.post<OAuthResponse>('/auth/oauth', payload);

  const data = response.data;
  setAuthAccessToken(data.accessToken);
  return {
    ...data,
    role: extractRoleFromAccessToken(data.accessToken),
  };
}
