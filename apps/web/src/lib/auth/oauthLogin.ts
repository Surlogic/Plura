import api from '@/services/api';

export type OAuthProvider = 'google' | 'apple';
export type OAuthRole = 'USER' | 'PROFESSIONAL' | null;

type OAuthUser = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
};

type OAuthResponse = {
  accessToken: string;
  user: OAuthUser;
};

export type OAuthLoginResult = OAuthResponse & {
  role: OAuthRole;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
};

const extractRoleFromAccessToken = (accessToken: string): OAuthRole => {
  try {
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

export async function oauthLogin(provider: OAuthProvider, token: string): Promise<OAuthLoginResult> {
  const response = await api.post<OAuthResponse>('/auth/oauth', {
    provider,
    token,
  });

  const data = response.data;
  return {
    ...data,
    role: extractRoleFromAccessToken(data.accessToken),
  };
}
