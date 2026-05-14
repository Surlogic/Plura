import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCurrentBillingPlanStateId,
  type BillingPlanStateSubscription,
} from './billingPlanState';

const buildSubscription = (
  overrides: Partial<BillingPlanStateSubscription> = {},
): BillingPlanStateSubscription => ({
  planCode: 'PLAN_LOCAL',
  status: 'TRIAL',
  cancelAtPeriodEnd: false,
  ...overrides,
});

test('resolveCurrentBillingPlanStateId does not promote a TRIAL subscription before webhook confirmation', () => {
  const currentPlanId = resolveCurrentBillingPlanStateId({
    profilePlanCode: 'PROFESSIONAL',
    subscription: buildSubscription(),
  });

  assert.equal(currentPlanId, 'PROFESSIONAL');
});

test('resolveCurrentBillingPlanStateId keeps the paid plan when the subscription is active', () => {
  const currentPlanId = resolveCurrentBillingPlanStateId({
    profilePlanCode: 'PROFESSIONAL',
    subscription: buildSubscription({
      status: 'ACTIVE',
    }),
  });

  assert.equal(currentPlanId, 'LOCAL');
});

test('resolveCurrentBillingPlanStateId keeps the paid plan while cancellation is scheduled', () => {
  const currentPlanId = resolveCurrentBillingPlanStateId({
    profilePlanCode: 'PROFESSIONAL',
    subscription: buildSubscription({
      status: 'ACTIVE',
      cancelAtPeriodEnd: true,
    }),
  });

  assert.equal(currentPlanId, 'LOCAL');
});
