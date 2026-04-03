import { toByteArray } from 'base64-js';

export type BackendAuthRole = 'USER' | 'PROFESSIONAL';

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
