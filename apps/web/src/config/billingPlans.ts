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
  accent: 'accent',
}));

export const billingPlanById: Record<keyof typeof sharedBillingPlanById, BillingPlanDefinition> = {
  CORE: billingPlans[0],
};

export { resolveBillingPlanFromBackendPlanCode, resolveBillingPlanFromProfilePlanCode };
