import type {
  SharedBillingPlanDefinition,
} from '../../../../packages/shared/src/billing/plans';
import {
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
  sharedBillingPlanById,
  sharedBillingPlans,
} from '../../../../packages/shared/src/billing/plans';

export type {
  BillingBackendPlanCode,
  BillingUiPlanId,
  PaidBillingUiPlanId,
} from '../../../../packages/shared/src/billing/plans';

export type BillingPlanDefinition = SharedBillingPlanDefinition & {
  note?: string;
  accent: 'default' | 'accent' | 'warm';
};

export const billingPlans: BillingPlanDefinition[] = sharedBillingPlans.map((plan) => ({
  ...plan,
  accent:
    plan.id === 'PROFESIONAL'
      ? 'accent'
      : plan.id === 'ENTERPRISE'
        ? 'warm'
        : 'default',
}));

export const billingPlanById: Record<keyof typeof sharedBillingPlanById, BillingPlanDefinition> = {
  BASIC: billingPlans[0],
  PROFESIONAL: billingPlans[1],
  ENTERPRISE: billingPlans[2],
};

export { resolveBillingPlanFromBackendPlanCode, resolveBillingPlanFromProfilePlanCode };
