import { isAxiosError } from 'axios';
import api from '@/services/api';
import {
  billingPlanById,
  type BillingUiPlanId,
  type PaidBillingUiPlanId,
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
} from '@/config/billingPlans';
import type { ProductPlanCode } from '@/types/professional';

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

type PendingCheckoutState = {
  planId: PaidBillingUiPlanId;
  createdAt: number;
};

export const BILLING_PENDING_CHECKOUT_STORAGE_KEY = 'plura.billing.pending-checkout';
export const BILLING_PENDING_CHECKOUT_RETURN_KEY = 'plura.billing.pending-checkout-return';

export const billingStatusLabels: Record<BillingUiStatus, string> = {
  NONE: 'Sin suscripcion',
  ACTIVE: 'Activa',
  TRIAL: 'Pago pendiente',
  PAST_DUE: 'Pago fallido',
  CANCELLED: 'Cancelada',
};

export const billingStatusClassNames: Record<BillingUiStatus, string> = {
  NONE: 'bg-[#E2E8F0] text-[#475569]',
  ACTIVE: 'bg-[#DCFCE7] text-[#166534]',
  TRIAL: 'bg-[#DBEAFE] text-[#1D4ED8]',
  PAST_DUE: 'bg-[#FEF3C7] text-[#B45309]',
  CANCELLED: 'bg-[#FEE2E2] text-[#B91C1C]',
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

export const formatBillingDate = (value?: string | null) => {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

export const createBillingCheckout = async (
  planId: PaidBillingUiPlanId,
): Promise<BillingCheckoutResponse> => {
  const plan = billingPlanById[planId];
  const response = await api.post<BillingCheckoutResponse>('/billing/subscription', {
    planCode: plan.backendPlanCode,
  });
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
  profilePlanCode?: ProductPlanCode | null;
  subscription: BillingSubscription | null;
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

export const resolveCurrentBillingStatus = (
  subscription: BillingSubscription | null,
): BillingUiStatus => subscription?.status || 'NONE';

export const setPendingCheckoutState = (value: PendingCheckoutState) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    BILLING_PENDING_CHECKOUT_STORAGE_KEY,
    JSON.stringify(value),
  );
};

export const getPendingCheckoutState = (): PendingCheckoutState | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(BILLING_PENDING_CHECKOUT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingCheckoutState>;
    if (
      (parsed.planId === 'PRO' || parsed.planId === 'PREMIUM')
      && typeof parsed.createdAt === 'number'
    ) {
      return {
        planId: parsed.planId,
        createdAt: parsed.createdAt,
      };
    }
  } catch {
    // Ignore malformed storage entries.
  }

  return null;
};

export const clearPendingCheckoutState = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BILLING_PENDING_CHECKOUT_STORAGE_KEY);
  window.sessionStorage.removeItem(BILLING_PENDING_CHECKOUT_RETURN_KEY);
};

export const armPendingCheckoutReturnState = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BILLING_PENDING_CHECKOUT_RETURN_KEY, '1');
};

export const hasPendingCheckoutReturnState = () => {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(BILLING_PENDING_CHECKOUT_RETURN_KEY) === '1';
};

export const clearPendingCheckoutReturnState = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(BILLING_PENDING_CHECKOUT_RETURN_KEY);
};
