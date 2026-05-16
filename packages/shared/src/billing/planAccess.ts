import type { LegacyProfessionalPlanCode, ProfessionalPlanCode } from '../types/professional';

export const normalizeProfessionalPlanCode = (
  plan: ProfessionalPlanCode | LegacyProfessionalPlanCode | string | undefined | null,
): ProfessionalPlanCode | null => {
  switch (plan?.toUpperCase()) {
    case 'CORE':
    case 'BASIC':
    case 'PROFESSIONAL':
    case 'PROFESIONAL':
    case 'LOCAL':
    case 'ENTERPRISE':
      return 'CORE';
    default:
      return null;
  }
};
