import {
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
  type BillingUiPlanId,
} from '../../config/billingPlans';

export type BillingPlanStateSubscription = {
  planCode: string;
  status: 'CHECKOUT_PENDING' | 'TRIALING' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  cancelAtPeriodEnd: boolean | null;
  trialActive?: boolean | null;
  planEnabled?: boolean | null;
};

export const resolveCurrentBillingPlanStateId = ({
  profilePlanCode,
  subscription,
}: {
  profilePlanCode?: string | null;
  subscription: BillingPlanStateSubscription | null;
}): BillingUiPlanId => {
  if (subscription) {
    const subscriptionPlan = resolveBillingPlanFromBackendPlanCode(subscription.planCode);
    if (
      subscriptionPlan &&
      (
        subscription.status === 'ACTIVE' ||
        subscription.status === 'TRIALING' ||
        (subscription.status === 'TRIAL' && subscription.trialActive === true) ||
        subscription.planEnabled === true ||
        Boolean(subscription.cancelAtPeriodEnd)
      )
    ) {
      return subscriptionPlan;
    }
  }

  return resolveBillingPlanFromProfilePlanCode(profilePlanCode);
};
