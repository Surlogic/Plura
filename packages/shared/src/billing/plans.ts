import type { ProfessionalPlanCode } from '../types/professional';

export type BillingUiPlanId = 'PROFESSIONAL' | 'LOCAL' | 'ENTERPRISE';
export type BillingBackendPlanCode = 'PLAN_PROFESSIONAL' | 'PLAN_LOCAL' | 'PLAN_ENTERPRISE';
export type PaidBillingUiPlanId = Exclude<BillingUiPlanId, 'PROFESSIONAL'>;

export type SharedBillingPlanDefinition = {
  id: BillingUiPlanId;
  label: string;
  backendPlanCode: BillingBackendPlanCode;
  profilePlanCode: ProfessionalPlanCode;
  priceMonthly: number;
  priceLabel: string;
  benefits: string[];
  recommended?: boolean;
};

export const sharedBillingPlans: SharedBillingPlanDefinition[] = [
  {
    id: 'PROFESSIONAL',
    label: 'Profesional',
    backendPlanCode: 'PLAN_PROFESSIONAL',
    profilePlanCode: 'PROFESSIONAL',
    priceMonthly: 0,
    priceLabel: 'Gratis',
    benefits: ['Logo, banner y textos publicos', 'Hasta 3 fotos en galeria', 'Hasta 15 servicios con 1 foto'],
  },
  {
    id: 'LOCAL',
    label: 'Local',
    backendPlanCode: 'PLAN_LOCAL',
    profilePlanCode: 'LOCAL',
    priceMonthly: 590,
    priceLabel: '$590 UYU / mes',
    benefits: ['Hasta 6 fotos en galeria', 'Hasta 30 servicios con 1 foto', 'Pagos online', 'Analytics basicos'],
    recommended: true,
  },
  {
    id: 'ENTERPRISE',
    label: 'Enterprise',
    backendPlanCode: 'PLAN_ENTERPRISE',
    profilePlanCode: 'ENTERPRISE',
    priceMonthly: 1290,
    priceLabel: '$1.290 UYU / mes',
    benefits: ['Hasta 10 fotos en galeria', 'Servicios ilimitados', 'Todo lo de Local', 'Mayor capacidad operativa'],
  },
];

export const sharedBillingPlanById = sharedBillingPlans.reduce<Record<BillingUiPlanId, SharedBillingPlanDefinition>>(
  (accumulator, plan) => {
    accumulator[plan.id] = plan;
    return accumulator;
  },
  {
    PROFESSIONAL: sharedBillingPlans[0],
    LOCAL: sharedBillingPlans[1],
    ENTERPRISE: sharedBillingPlans[2],
  },
);

export const resolveBillingPlanFromProfilePlanCode = (
  planCode?: ProfessionalPlanCode | string | null,
): BillingUiPlanId => {
  switch (planCode?.toUpperCase()) {
    case 'PROFESIONAL':
    case 'LOCAL':
      return 'LOCAL';
    case 'ENTERPRISE':
      return 'ENTERPRISE';
    case 'BASIC':
    case 'PROFESSIONAL':
    default:
      return 'PROFESSIONAL';
  }
};

export const resolveBillingPlanFromBackendPlanCode = (
  planCode?: string | null,
): BillingUiPlanId | null => {
  switch (planCode?.toUpperCase()) {
    case 'PLAN_BASIC':
      return 'PROFESSIONAL';
    case 'PLAN_PRO':
    case 'PLAN_PROFESIONAL':
      return 'LOCAL';
    case 'PLAN_PREMIUM':
      return 'ENTERPRISE';
    case 'PLAN_PROFESSIONAL':
      return 'PROFESSIONAL';
    case 'PLAN_LOCAL':
      return 'LOCAL';
    case 'PLAN_ENTERPRISE':
      return 'ENTERPRISE';
    default:
      return null;
  }
};
