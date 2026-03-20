import { memo } from 'react';
import type { BillingPlanDefinition, BillingUiPlanId } from '@/config/billingPlans';
import BillingPlanCard from '@/components/billing/BillingPlanCard';

type BillingPlansGridProps = {
  plans: BillingPlanDefinition[];
  currentPlanId: BillingUiPlanId;
  currentSubscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
  isBusy: boolean;
  onSelectPlan: (planId: BillingUiPlanId) => void;
};

const resolveButtonLabel = ({
  planId,
  currentPlanId,
  currentSubscriptionStatus,
  cancelAtPeriodEnd,
}: {
  planId: BillingUiPlanId;
  currentPlanId: BillingUiPlanId;
  currentSubscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
}) => {
  if (planId === currentPlanId && currentSubscriptionStatus !== 'CANCELLED' && !cancelAtPeriodEnd) {
    return 'Plan actual';
  }

  if (planId === 'BASIC') {
    return cancelAtPeriodEnd ? 'Cambio programado' : 'Cambiar a BASIC';
  }

  if (currentPlanId === 'BASIC') {
    return 'Suscribirme';
  }

  return `Cambiar a ${planId}`;
};

function BillingPlansGrid({
  plans,
  currentPlanId,
  currentSubscriptionStatus,
  cancelAtPeriodEnd,
  isBusy,
  onSelectPlan,
}: BillingPlansGridProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {plans.map((plan) => {
        const buttonLabel = resolveButtonLabel({
          planId: plan.id,
          currentPlanId,
          currentSubscriptionStatus,
          cancelAtPeriodEnd,
        });

        const isCurrent =
          plan.id === currentPlanId
          && currentSubscriptionStatus !== 'CANCELLED'
          && !cancelAtPeriodEnd;

        const disabled =
          isCurrent
          || (plan.id === 'BASIC' && cancelAtPeriodEnd);

        return (
          <BillingPlanCard
            key={plan.id}
            plan={plan}
            buttonLabel={buttonLabel}
            isCurrent={isCurrent}
            isBusy={isBusy}
            disabled={disabled}
            onSelect={() => onSelectPlan(plan.id)}
          />
        );
      })}
    </div>
  );
}

export default memo(BillingPlansGrid);
