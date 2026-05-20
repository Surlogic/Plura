import { isAxiosError } from 'axios';
import api from '@/services/api';
import {
  type BillingUiPlanId,
} from '@/config/billingPlans';
import { resolveCurrentBillingPlanStateId } from './billingPlanState';

export type BillingSubscriptionStatus =
  | 'CHECKOUT_PENDING'
  | 'TRIALING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';
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
  trialStartAt: string | null;
  trialEndAt: string | null;
  trialDaysRemaining: number | null;
  trialActive: boolean | null;
  paymentMethodAttached: boolean | null;
  planEnabled: boolean;
};

export type BillingCheckoutResponse = {
  subscriptionId: string;
  checkoutUrl: string | null;
  provider: string;
  planCode: 'PLAN_CORE' | string;
  status: BillingSubscriptionStatus;
  trialStartAt: string | null;
  trialEndAt: string | null;
  requiresCheckout: boolean;
  trialEligible?: boolean;
  trialPreviouslyUsed?: boolean;
  activationMode?: 'TRIAL' | 'CHECKOUT';
};

export type ProfessionalRegistrationCheckoutResponse = {
  checkoutUrl: string | null;
  checkoutToken: string | null;
  checkoutRef: string | null;
  provider: string;
  planCode: 'PLAN_CORE' | string;
  status: BillingSubscriptionStatus;
  trialStartAt: string | null;
  trialEndAt: string | null;
  requiresCheckout: boolean;
  confirmed: boolean;
};

type PendingCheckoutState = {
  planId: 'CORE';
  createdAt: number;
};

export const BILLING_PENDING_CHECKOUT_STORAGE_KEY = 'plura.billing.pending-checkout';
export const BILLING_PENDING_CHECKOUT_RETURN_KEY = 'plura.billing.pending-checkout-return';

export const billingStatusLabels: Record<BillingUiStatus, string> = {
  NONE: 'Sin suscripcion',
  CHECKOUT_PENDING: 'Activacion pendiente',
  TRIALING: 'Prueba gratuita',
  TRIAL: 'Prueba gratuita',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago fallido',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Prueba vencida',
};

export const billingStatusClassNames: Record<BillingUiStatus, string> = {
  NONE: 'bg-[#E2E8F0] text-[#475569]',
  CHECKOUT_PENDING: 'bg-[#FEF3C7] text-[#B45309]',
  TRIALING: 'bg-[#DBEAFE] text-[#1D4ED8]',
  TRIAL: 'bg-[#DBEAFE] text-[#1D4ED8]',
  ACTIVE: 'bg-[#DCFCE7] text-[#166534]',
  PAST_DUE: 'bg-[#FEF3C7] text-[#B45309]',
  REJECTED: 'bg-[#FEE2E2] text-[#B91C1C]',
  CANCELLED: 'bg-[#FEE2E2] text-[#B91C1C]',
  EXPIRED: 'bg-[#FEE2E2] text-[#B91C1C]',
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

export const createCoreSubscription = async (): Promise<BillingCheckoutResponse> => {
  const response = await api.post<BillingCheckoutResponse>('/billing/subscription', {
    planCode: 'PLAN_CORE',
  });
  return response.data;
};

export const createProfessionalRegistrationCheckout = async ({
  email,
  returnUrl,
}: {
  email: string;
  returnUrl?: string;
}): Promise<ProfessionalRegistrationCheckoutResponse> => {
  const response = await api.post<ProfessionalRegistrationCheckoutResponse>(
    '/api/v1/billing/professional-registration/checkout',
    {
      planCode: 'PLAN_CORE',
      email,
      returnUrl,
    },
  );
  return response.data;
};

type ProfessionalRegistrationCheckoutVerifyInput =
  | string
  | {
    checkoutToken?: string | null;
    checkoutRef?: string | null;
  };

export const verifyProfessionalRegistrationCheckout = async (
  input: ProfessionalRegistrationCheckoutVerifyInput,
): Promise<ProfessionalRegistrationCheckoutResponse> => {
  const payload = typeof input === 'string'
    ? { checkoutToken: input }
    : {
      checkoutToken: input.checkoutToken || undefined,
      checkoutRef: input.checkoutRef || undefined,
    };

  const response = await api.post<ProfessionalRegistrationCheckoutResponse>(
    '/api/v1/billing/professional-registration/verify',
    payload,
  );
  return response.data;
};

export const attachProfessionalRegistrationCheckout = async (
  checkoutToken: string,
): Promise<ProfessionalRegistrationCheckoutResponse> => {
  const response = await api.post<ProfessionalRegistrationCheckoutResponse>(
    '/billing/professional-registration/attach',
    { checkoutToken },
  );
  return response.data;
};

export const isCoreSubscriptionEnabled = (
  subscription?: BillingSubscription | BillingCheckoutResponse | null,
) =>
  subscription?.status === 'ACTIVE' ||
  subscription?.status === 'TRIALING' ||
  (
    subscription?.status === 'TRIAL' &&
    'trialActive' in subscription &&
    subscription.trialActive === true
  ) ||
  (
    'planEnabled' in (subscription ?? {}) &&
    (subscription as BillingSubscription).planEnabled === true
  );

export const resolveCurrentBillingPlanId = ({
  profilePlanCode,
  subscription,
}: {
  profilePlanCode?: string | null;
  subscription: BillingSubscription | null;
}): BillingUiPlanId | null =>
  resolveCurrentBillingPlanStateId({
    profilePlanCode,
    subscription,
  });

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
    const parsed = JSON.parse(raw) as { planId?: string; createdAt?: unknown };
    if (
      parsed.planId === 'CORE'
      && typeof parsed.createdAt === 'number'
    ) {
      return {
        planId: 'CORE',
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
