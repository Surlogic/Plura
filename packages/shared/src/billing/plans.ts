import type { ProfessionalPlanCode } from '../types/professional';

export type BillingUiPlanId = 'BASIC' | 'PROFESIONAL' | 'ENTERPRISE';
export type BillingBackendPlanCode = 'PLAN_BASIC' | 'PLAN_PROFESIONAL' | 'PLAN_ENTERPRISE';
export type PaidBillingUiPlanId = Exclude<BillingUiPlanId, 'BASIC'>;

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
    id: 'BASIC',
    label: 'Free',
    backendPlanCode: 'PLAN_BASIC',
    profilePlanCode: 'BASIC',
    priceMonthly: 0,
    priceLabel: 'Gratis',
    benefits: ['Logo, banner y textos publicos', 'Hasta 3 fotos en galeria', 'Hasta 15 servicios con 1 foto'],
  },
  {
    id: 'PROFESIONAL',
    label: 'Pro',
    backendPlanCode: 'PLAN_PROFESIONAL',
    profilePlanCode: 'PROFESIONAL',
    priceMonthly: 590,
    priceLabel: '$590 UYU / mes',
    benefits: ['Hasta 6 fotos en galeria', 'Hasta 30 servicios con 1 foto', 'Pagos online', 'Analytics basicos'],
    recommended: true,
  },
  {
    id: 'ENTERPRISE',
    label: 'Premium',
    backendPlanCode: 'PLAN_ENTERPRISE',
    profilePlanCode: 'ENTERPRISE',
    priceMonthly: 1290,
    priceLabel: '$1.290 UYU / mes',
    benefits: ['Hasta 10 fotos en galeria', 'Servicios ilimitados', 'Todo lo de Pro', 'Mayor capacidad operativa'],
  },
];

export const sharedBillingPlanById = sharedBillingPlans.reduce<Record<BillingUiPlanId, SharedBillingPlanDefinition>>(
  (accumulator, plan) => {
    accumulator[plan.id] = plan;
    return accumulator;
  },
  {
    BASIC: sharedBillingPlans[0],
    PROFESIONAL: sharedBillingPlans[1],
    ENTERPRISE: sharedBillingPlans[2],
  },
);

export const resolveBillingPlanFromProfilePlanCode = (
  planCode?: ProfessionalPlanCode | string | null,
): BillingUiPlanId => {
  switch (planCode?.toUpperCase()) {
    case 'PROFESIONAL':
      return 'PROFESIONAL';
    case 'ENTERPRISE':
      return 'ENTERPRISE';
    case 'BASIC':
    default:
      return 'BASIC';
  }
};

export const resolveBillingPlanFromBackendPlanCode = (
  planCode?: string | null,
): BillingUiPlanId | null => {
  switch (planCode?.toUpperCase()) {
    case 'PLAN_BASIC':
      return 'BASIC';
    case 'PLAN_PROFESIONAL':
      return 'PROFESIONAL';
    case 'PLAN_ENTERPRISE':
      return 'ENTERPRISE';
    default:
      return null;
  }
};
