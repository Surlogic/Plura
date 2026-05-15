const DEFAULT_SITE_URL = 'https://pluraapp.com';

export const SITE_NAME = 'Plura';
export const DEFAULT_SEO_TITLE = 'Plura | Reservas online para belleza, bienestar y servicios';
export const DEFAULT_SEO_DESCRIPTION =
  'Encontrá salones de belleza, profesionales, locales y servicios cerca tuyo. Reservá turnos online en Plura de forma simple.';

export const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
};

export const buildAbsoluteUrl = (path = '/') => {
  const siteUrl = getSiteUrl();
  if (!path) return siteUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const normalizeSeoText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export const humanizeSlugForSeo = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const safeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');
