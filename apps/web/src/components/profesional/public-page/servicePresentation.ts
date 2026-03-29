import type { PublicService } from '@/types/professional';

export const formatServiceDuration = (value?: string) => {
  if (!value) return 'Duracion a definir';
  const trimmed = value.trim();
  if (!trimmed) return 'Duracion a definir';
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes)) return trimmed;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
};

export const formatServicePrice = (value?: string) => {
  if (!value) return 'Consultar';
  const trimmed = value.trim();
  if (!trimmed) return 'Consultar';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}`;
};

export const formatServicePaymentType = (value?: string) => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'DEPOSIT') return 'Seña online';
  if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'Pago total online';
  return 'Pago en el lugar';
};

export const resolveServiceCategoryLabel = (
  service?: PublicService | null,
  fallbackCategoryName?: string | null,
) => {
  const serviceCategory = service?.categoryName?.trim();
  if (serviceCategory) return serviceCategory;
  const fallback = fallbackCategoryName?.trim() || '';
  return fallback || 'Servicios';
};
