import type { ProfessionalPlanCode } from '../types/professional';

export type BillingUiPlanId = 'CORE' | 'PROFESSIONAL' | 'LOCAL' | 'ENTERPRISE';
export type BillingBackendPlanCode = 'PLAN_CORE' | 'PLAN_PROFESSIONAL' | 'PLAN_LOCAL' | 'PLAN_ENTERPRISE';
export type PaidBillingUiPlanId = 'LOCAL' | 'ENTERPRISE';

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
    id: 'CORE',
    label: 'Plura Core',
    backendPlanCode: 'PLAN_CORE',
    profilePlanCode: 'CORE',
    priceMonthly: 590,
    priceLabel: 'Suscripcion unica',
    benefits: [
      'Pagina publica, marketplace y reservas online',
      'Agenda, calendario, horarios y bloqueos',
      'Servicios, dashboard y notificaciones',
      'Perfil publico con logo, banner, descripcion y fotos',
      '1 profesional y 1 local incluidos',
      'Cobros online con Mercado Pago',
    ],
    recommended: true,
  },
];

export const sharedBillingPlanById: Record<BillingUiPlanId, SharedBillingPlanDefinition> = {
  CORE: sharedBillingPlans[0],
  PROFESSIONAL: sharedBillingPlans[0],
  LOCAL: sharedBillingPlans[0],
  ENTERPRISE: sharedBillingPlans[0],
};

export const resolveBillingPlanFromProfilePlanCode = (
  planCode?: ProfessionalPlanCode | string | null,
): BillingUiPlanId => {
  switch (planCode?.toUpperCase()) {
    case 'CORE':
    case 'PROFESIONAL':
    case 'LOCAL':
    case 'ENTERPRISE':
    case 'BASIC':
    case 'PROFESSIONAL':
    default:
      return 'CORE';
  }
};

export const resolveBillingPlanFromBackendPlanCode = (
  planCode?: string | null,
): BillingUiPlanId | null => {
  switch (planCode?.toUpperCase()) {
    case 'PLAN_CORE':
    case 'PLAN_BASIC':
    case 'PLAN_PRO':
    case 'PLAN_PROFESIONAL':
    case 'PLAN_PREMIUM':
    case 'PLAN_PROFESSIONAL':
    case 'PLAN_LOCAL':
    case 'PLAN_ENTERPRISE':
      return 'CORE';
    default:
      return null;
  }
};
