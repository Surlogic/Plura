import type { ProfessionalPlanCode } from '../types/professional';

const PLAN_ORDER: Record<ProfessionalPlanCode, number> = {
  BASIC: 0,
  PROFESIONAL: 1,
  ENTERPRISE: 2,
};

export const hasPlanAccess = (
  currentPlan: ProfessionalPlanCode | undefined | null,
  requiredPlan: ProfessionalPlanCode,
): boolean => {
  if (!currentPlan) return false;
  return PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan];
};

export const nextPlanFor = (
  currentPlan: ProfessionalPlanCode | undefined | null,
): ProfessionalPlanCode | null => {
  switch (currentPlan) {
    case 'BASIC':
      return 'PROFESIONAL';
    case 'PROFESIONAL':
      return 'ENTERPRISE';
    default:
      return null;
  }
};

export const PLAN_LABELS: Record<ProfessionalPlanCode, string> = {
  BASIC: 'Basic',
  PROFESIONAL: 'Profesional',
  ENTERPRISE: 'Enterprise',
};
