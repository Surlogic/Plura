import {
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
  type BillingUiPlanId,
} from '../../config/billingPlans';
import type { ProfessionalPlanCode } from '../../types/professional';

export type BillingPlanStateSubscription = {
  planCode: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
  cancelAtPeriodEnd: boolean | null;
};

export const resolveCurrentBillingPlanStateId = ({
  profilePlanCode,
  subscription,
}: {
  profilePlanCode?: ProfessionalPlanCode | null;
  subscription: BillingPlanStateSubscription | null;
}): BillingUiPlanId => {
  if (subscription) {
    const subscriptionPlan = resolveBillingPlanFromBackendPlanCode(subscription.planCode);
    if (
      subscriptionPlan &&
      (subscription.status === 'ACTIVE' || Boolean(subscription.cancelAtPeriodEnd))
    ) {
      return subscriptionPlan;
    }
  }

  return resolveBillingPlanFromProfilePlanCode(profilePlanCode);
};
