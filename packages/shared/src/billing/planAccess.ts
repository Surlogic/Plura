import type { LegacyProfessionalPlanCode, ProfessionalPlanCode } from '../types/professional';

export const normalizeProfessionalPlanCode = (
  plan: ProfessionalPlanCode | LegacyProfessionalPlanCode | string | undefined | null,
): ProfessionalPlanCode | null => {
  switch (plan?.toUpperCase()) {
    case 'CORE':
      return 'CORE';
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

export const hasPlanAccess = (
  currentPlan: ProfessionalPlanCode | LegacyProfessionalPlanCode | string | undefined | null,
  requiredPlan: ProfessionalPlanCode,
): boolean => {
  const normalizedCurrentPlan = normalizeProfessionalPlanCode(currentPlan);
  return normalizedCurrentPlan === 'CORE' && requiredPlan === 'CORE';
};

export const nextPlanFor = (
  currentPlan: ProfessionalPlanCode | LegacyProfessionalPlanCode | string | undefined | null,
): ProfessionalPlanCode | null => {
  switch (normalizeProfessionalPlanCode(currentPlan)) {
    default:
      return null;
  }
};

export const PLAN_LABELS: Record<ProfessionalPlanCode, string> = {
  CORE: 'Plura Core',
};
