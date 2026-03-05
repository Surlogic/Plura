import type { SearchType } from '@/types/search';

export const slugToLabel = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-UY')
    .trim();

export const shouldOmitRubroQuery = (
  type?: SearchType,
  query?: string,
  categorySlug?: string,
) => {
  if (type !== 'RUBRO') return false;

  const normalizedQuery = normalizeSearchText(query || '');
  const normalizedCategory = normalizeSearchText((categorySlug || '').replace(/-/g, ' '));

  if (!normalizedQuery || !normalizedCategory) return false;
  return normalizedQuery === normalizedCategory;
};
