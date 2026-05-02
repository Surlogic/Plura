import { toByteArray } from 'base64-js';

export type BackendAuthRole = 'USER' | 'PROFESSIONAL';
export type AuthContextType = 'CLIENT' | 'PROFESSIONAL' | 'WORKER';

export type AccessTokenPayload = {
  role?: BackendAuthRole;
  ctx?: AuthContextType;
  pid?: string;
  wid?: string;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const bytes = toByteArray(padded);
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
};

const parsePayload = (accessToken: string | null | undefined): AccessTokenPayload | null => {
  try {
    if (!accessToken) return null;
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const extractRoleFromAccessToken = (
  accessToken: string | null | undefined,
): BackendAuthRole | null => {
  const payload = parsePayload(accessToken);
  if (!payload) return null;
  if (payload.role === 'PROFESSIONAL') return 'PROFESSIONAL';
  if (payload.role === 'USER') return 'USER';
  return null;
};

export const extractContextFromAccessToken = (
  accessToken: string | null | undefined,
): AuthContextType | null => {
  const payload = parsePayload(accessToken);
  if (!payload) return null;
  if (payload.ctx === 'WORKER') return 'WORKER';
  if (payload.ctx === 'PROFESSIONAL') return 'PROFESSIONAL';
  if (payload.ctx === 'CLIENT') return 'CLIENT';
  return null;
};

export const extractWorkerInfoFromAccessToken = (
  accessToken: string | null | undefined,
): { workerId: string | null; professionalId: string | null } => {
  const payload = parsePayload(accessToken);
  if (!payload) return { workerId: null, professionalId: null };
  return {
    workerId: payload.wid ?? null,
    professionalId: payload.pid ?? null,
  };
};
