import type { ProfessionalPlanCode } from '../types/professional';

const PLAN_ORDER: Record<ProfessionalPlanCode, number> = {
  CORE: 0,
  PROFESSIONAL: 0,
  LOCAL: 0,
  ENTERPRISE: 0,
};

export const normalizeProfessionalPlanCode = (
  plan: ProfessionalPlanCode | string | undefined | null,
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
    default:
      return null;
  }
};

export const PLAN_LABELS: Record<ProfessionalPlanCode, string> = {
  CORE: 'Plura Core',
  PROFESSIONAL: 'Plura Core',
  LOCAL: 'Plura Core',
  ENTERPRISE: 'Plura Core',
};
