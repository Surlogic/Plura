import type { ProfessionalPlanCode } from '../types/professional';

const PLAN_ORDER: Record<ProfessionalPlanCode, number> = {
  PROFESSIONAL: 0,
  LOCAL: 1,
  ENTERPRISE: 2,
};

export const normalizeProfessionalPlanCode = (
  plan: ProfessionalPlanCode | string | undefined | null,
): ProfessionalPlanCode | null => {
  switch (plan?.toUpperCase()) {
    case 'BASIC':
    case 'PROFESSIONAL':
      return 'PROFESSIONAL';
    case 'PROFESIONAL':
    case 'LOCAL':
      return 'LOCAL';
    case 'ENTERPRISE':
      return 'ENTERPRISE';
    default:
      return null;
  }
};

export const hasPlanAccess = (
  currentPlan: ProfessionalPlanCode | string | undefined | null,
  requiredPlan: ProfessionalPlanCode,
): boolean => {
  const normalizedCurrentPlan = normalizeProfessionalPlanCode(currentPlan);
  if (!normalizedCurrentPlan) return false;
  return PLAN_ORDER[normalizedCurrentPlan] >= PLAN_ORDER[requiredPlan];
};

export const nextPlanFor = (
  currentPlan: ProfessionalPlanCode | string | undefined | null,
): ProfessionalPlanCode | null => {
  switch (normalizeProfessionalPlanCode(currentPlan)) {
    case 'PROFESSIONAL':
      return 'LOCAL';
    case 'LOCAL':
      return 'ENTERPRISE';
    default:
      return null;
  }
};

export const PLAN_LABELS: Record<ProfessionalPlanCode, string> = {
  PROFESSIONAL: 'Profesional',
  LOCAL: 'Local',
  ENTERPRISE: 'Enterprise',
};
