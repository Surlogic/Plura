import type { CSSProperties } from 'react';
import type { ProfessionalMediaPresentation } from '@/types/professional';

export const DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION: ProfessionalMediaPresentation = {
  positionX: 50,
  positionY: 50,
  zoom: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeProfessionalMediaPresentation = (
  value?: Partial<ProfessionalMediaPresentation> | null,
): ProfessionalMediaPresentation => ({
  positionX: clamp(
    typeof value?.positionX === 'number'
      ? value.positionX
      : DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION.positionX,
    0,
    100,
  ),
  positionY: clamp(
    typeof value?.positionY === 'number'
      ? value.positionY
      : DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION.positionY,
    0,
    100,
  ),
  zoom: clamp(
    typeof value?.zoom === 'number'
      ? value.zoom
      : DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION.zoom,
    1,
    3,
  ),
});

export const buildProfessionalMediaStyle = (
  value?: Partial<ProfessionalMediaPresentation> | null,
): CSSProperties => {
  const normalized = normalizeProfessionalMediaPresentation(value);
  return {
    objectPosition: `${normalized.positionX}% ${normalized.positionY}%`,
    transformOrigin: `${normalized.positionX}% ${normalized.positionY}%`,
    transform: normalized.zoom > 1.001 ? `scale(${normalized.zoom})` : undefined,
  };
};

export const roundProfessionalMediaZoom = (value: number) =>
  Math.round(value * 100) / 100;
