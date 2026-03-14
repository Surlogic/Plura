import { isAxiosError } from 'axios';
import api from './api';
import {
  billingPlanById,
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
  type BillingUiPlanId,
  type PaidBillingUiPlanId,
} from '../config/billingPlans';
import type { ProfessionalPlanCode } from '../types/professional';
import type {
  ProfessionalPayoutConfig,
  ProfessionalPayoutConfigUpdateInput,
} from '../types/payout';

export type BillingSubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
export type BillingUiStatus = BillingSubscriptionStatus | 'NONE';

export type BillingSubscription = {
  subscriptionId: string;
  planCode: string;
  status: BillingSubscriptionStatus;
  provider: string;
  amount: number | string | null;
  currency: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  premiumEnabled: boolean;
};

type BillingCheckoutResponse = {
  subscriptionId: string;
  checkoutUrl: string;
  provider: string;
  planCode: string;
};

export const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

export const formatBillingAmount = (
  amount: number | string | null,
  currency?: string | null,
) => {
  if (amount === null || amount === undefined || amount === '') return 'No disponible';
  const numericAmount =
    typeof amount === 'number' ? amount : Number.parseFloat(String(amount));

  if (!Number.isFinite(numericAmount)) return String(amount);

  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${numericAmount} ${currency || ''}`.trim();
  }
};

export const fetchCurrentSubscription = async (): Promise<BillingSubscription | null> => {
  try {
    const response = await api.get<BillingSubscription>('/billing/subscription');
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

const ALLOWED_CHECKOUT_DOMAINS = [
  'https://www.mercadopago.com',
  'https://www.mercadopago.com.uy',
  'https://www.mercadopago.com.ar',
  'https://sandbox.mercadopago.com',
  'https://sandbox.mercadopago.com.uy',
  'https://sandbox.mercadopago.com.ar',
];

const isAllowedCheckoutUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_CHECKOUT_DOMAINS.some(
      (domain) => parsed.origin === new URL(domain).origin,
    );
  } catch {
    return false;
  }
};

export const createBillingCheckout = async (
  planId: PaidBillingUiPlanId,
): Promise<BillingCheckoutResponse> => {
  const plan = billingPlanById[planId];
  const response = await api.post<BillingCheckoutResponse>('/billing/subscription', {
    planCode: plan.backendPlanCode,
  });

  if (!isAllowedCheckoutUrl(response.data.checkoutUrl)) {
    throw new Error('URL de checkout no permitida');
  }

  return response.data;
};

export const cancelBillingSubscription = async (): Promise<BillingSubscription> => {
  const response = await api.post<BillingSubscription>('/billing/cancel', {
    immediate: false,
  });
  return response.data;
};

export const resolveCurrentBillingPlanId = ({
  profilePlanCode,
  subscription,
}: {
  profilePlanCode?: ProfessionalPlanCode | null;
  subscription: BillingSubscription | null;
}): BillingUiPlanId => {
  if (subscription) {
    const subscriptionPlan = resolveBillingPlanFromBackendPlanCode(subscription.planCode);
    if (
      subscriptionPlan
      && (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL' || Boolean(subscription.cancelAtPeriodEnd))
    ) {
      return subscriptionPlan;
    }
  }

  return resolveBillingPlanFromProfilePlanCode(profilePlanCode);
};

export const resolveCurrentBillingStatus = (
  subscription: BillingSubscription | null,
): BillingUiStatus => subscription?.status || 'NONE';

export const getProfessionalPayoutConfig = async (): Promise<ProfessionalPayoutConfig> => {
  const response = await api.get<ProfessionalPayoutConfig>('/profesional/payout-config');
  return response.data;
};

export const updateProfessionalPayoutConfig = async (
  payload: ProfessionalPayoutConfigUpdateInput,
): Promise<ProfessionalPayoutConfig> => {
  const response = await api.put<ProfessionalPayoutConfig>('/profesional/payout-config', payload);
  return response.data;
};
