import type { ProfessionalPlanCode } from '../types/professional';

export type BillingUiPlanId = 'CORE';
export type BillingBackendPlanCode = 'PLAN_CORE';

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
    priceLabel: '2 meses gratis, luego suscripcion mensual',
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
};

export const resolveBillingPlanFromProfilePlanCode = (
  planCode?: ProfessionalPlanCode | string | null,
): BillingUiPlanId | null => (planCode?.toUpperCase() === 'CORE' ? 'CORE' : null);

export const resolveBillingPlanFromBackendPlanCode = (
  planCode?: BillingBackendPlanCode | string | null,
): BillingUiPlanId | null => {
  switch (planCode?.toUpperCase()) {
    case 'PLAN_CORE':
      return 'CORE';
    default:
      return null;
  }
};
