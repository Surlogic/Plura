import type { ProductPlanCode } from '../types/professional';

export type BillingUiPlanId = 'BASIC' | 'PRO' | 'PREMIUM';
export type BillingBackendPlanCode = 'PLAN_BASIC' | 'PLAN_PRO' | 'PLAN_PREMIUM';
export type PaidBillingUiPlanId = Exclude<BillingUiPlanId, 'BASIC'>;

export type SharedBillingPlanDefinition = {
  id: BillingUiPlanId;
  label: string;
  backendPlanCode: BillingBackendPlanCode;
  profilePlanCode: ProductPlanCode;
  priceMonthly: number;
  priceLabel: string;
  benefits: string[];
  recommended?: boolean;
};

export const sharedBillingPlans: SharedBillingPlanDefinition[] = [
  {
    id: 'BASIC',
    label: 'BASIC',
    backendPlanCode: 'PLAN_BASIC',
    profilePlanCode: 'BASIC',
    priceMonthly: 0,
    priceLabel: 'Gratis',
    benefits: ['Perfil publico', 'Agenda basica', 'Reservas manuales'],
  },
  {
    id: 'PRO',
    label: 'PRO',
    backendPlanCode: 'PLAN_PRO',
    profilePlanCode: 'PROFESSIONAL',
    priceMonthly: 590,
    priceLabel: '$590 UYU / mes',
    benefits: ['Pagos online', 'Analytics', 'Automatizaciones', 'WhatsApp automatico'],
    recommended: true,
  },
  {
    id: 'PREMIUM',
    label: 'PREMIUM',
    backendPlanCode: 'PLAN_PREMIUM',
    profilePlanCode: 'COMPANY',
    priceMonthly: 1290,
    priceLabel: '$1.290 UYU / mes',
    benefits: ['Todo lo de PRO', 'Tienda', 'Chat', 'Mayor capacidad operativa'],
  },
];

export const sharedBillingPlanById = sharedBillingPlans.reduce<Record<BillingUiPlanId, SharedBillingPlanDefinition>>(
  (accumulator, plan) => {
    accumulator[plan.id] = plan;
    return accumulator;
  },
  {
    BASIC: sharedBillingPlans[0],
    PRO: sharedBillingPlans[1],
    PREMIUM: sharedBillingPlans[2],
  },
);

export const resolveBillingPlanFromProfilePlanCode = (
  planCode?: ProductPlanCode | null,
): BillingUiPlanId => {
  switch (planCode) {
    case 'PROFESSIONAL':
      return 'PRO';
    case 'COMPANY':
      return 'PREMIUM';
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
    case 'BASIC':
      return 'BASIC';
    case 'PLAN_PRO':
    case 'PRO':
    case 'PROFESSIONAL':
      return 'PRO';
    case 'PLAN_PREMIUM':
    case 'PREMIUM':
    case 'COMPANY':
      return 'PREMIUM';
    default:
      return null;
  }
};
