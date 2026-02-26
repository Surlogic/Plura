const getSecureAttr = (): string =>
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

export const getProfessionalToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )plura_professional_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const setProfessionalToken = (token: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `plura_professional_token=${encodeURIComponent(
    token,
  )}; path=/; max-age=28800; SameSite=Strict${getSecureAttr()}`;
};

export const clearProfessionalToken = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `plura_professional_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict${getSecureAttr()}`;
};

export const getClientToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )plura_client_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const setClientToken = (token: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `plura_client_token=${encodeURIComponent(
    token,
  )}; path=/; max-age=28800; SameSite=Strict${getSecureAttr()}`;
};

export const clearClientToken = () => {
  if (typeof document === 'undefined') return;
  document.cookie = `plura_client_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict${getSecureAttr()}`;
};
