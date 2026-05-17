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

const isSubscriptionAccessEnabled = (subscription: BillingPlanStateSubscription) =>
  subscription.status === 'ACTIVE' ||
  subscription.status === 'TRIALING' ||
  (subscription.status === 'TRIAL' && subscription.trialActive === true) ||
  subscription.planEnabled === true ||
  Boolean(subscription.cancelAtPeriodEnd);

export const resolveCurrentBillingPlanStateId = ({
  profilePlanCode,
  subscription,
}: {
  profilePlanCode?: string | null;
  subscription: BillingPlanStateSubscription | null;
}): BillingUiPlanId | null => {
  if (subscription) {
    const subscriptionPlan = resolveBillingPlanFromBackendPlanCode(subscription.planCode);
    if (subscriptionPlan && isSubscriptionAccessEnabled(subscription)) {
      return subscriptionPlan;
    }
    if (!subscriptionPlan && isSubscriptionAccessEnabled(subscription)) return null;
  }

  const profilePlan = resolveBillingPlanFromProfilePlanCode(profilePlanCode);
  if (profilePlan) return profilePlan;

  return profilePlanCode ? null : 'CORE';
};
