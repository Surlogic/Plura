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

export type ProfessionalMercadoPagoConnectionStatus =
  | 'PENDING_AUTHORIZATION'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | string;

export type ProfessionalMercadoPagoConnection = {
  provider?: string | null;
  status?: ProfessionalMercadoPagoConnectionStatus | null;
  connected: boolean;
  providerAccountId?: string | null;
  providerUserId?: string | null;
  scope?: string | null;
  tokenExpiresAt?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
};

type MercadoPagoOAuthStartResponse = {
  provider?: string | null;
  authorizationUrl?: string | null;
  state?: string | null;
  stateExpiresAt?: string | null;
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
      && (subscription.status === 'ACTIVE' || Boolean(subscription.cancelAtPeriodEnd))
    ) {
      return subscriptionPlan;
    }
  }

  return resolveBillingPlanFromProfilePlanCode(profilePlanCode);
};

export const resolveCurrentBillingStatus = (
  subscription: BillingSubscription | null,
): BillingUiStatus => subscription?.status || 'NONE';

const MERCADO_PAGO_CONNECTION_BASE_PATH = '/profesional/payment-providers/mercadopago';

export const getProfessionalMercadoPagoConnection = async (): Promise<ProfessionalMercadoPagoConnection> => {
  const response = await api.get<ProfessionalMercadoPagoConnection>(
    `${MERCADO_PAGO_CONNECTION_BASE_PATH}/connection`,
  );
  return response.data;
};

export const startProfessionalMercadoPagoOAuth = async (): Promise<MercadoPagoOAuthStartResponse> => {
  const response = await api.post<MercadoPagoOAuthStartResponse>(
    `${MERCADO_PAGO_CONNECTION_BASE_PATH}/oauth/start`,
  );
  return response.data;
};

export const disconnectProfessionalMercadoPagoConnection = async (): Promise<ProfessionalMercadoPagoConnection> => {
  const response = await api.delete<ProfessionalMercadoPagoConnection>(
    `${MERCADO_PAGO_CONNECTION_BASE_PATH}/connection`,
  );
  return response.data;
};

export const getMercadoPagoConnectionStatusCopy = (
  connection?: ProfessionalMercadoPagoConnection | null,
) => {
  const status = connection?.status?.toUpperCase();

  if (connection?.connected || status === 'CONNECTED') {
    return {
      badge: 'Conectado',
      title: 'Tu cuenta esta lista para cobrar reservas',
      description:
        'Tus clientes podran pagar reservas online y el cobro se procesara con tu cuenta conectada.',
    };
  }

  if (status === 'ERROR') {
    return {
      badge: 'Revisar conexion',
      title: 'Hay un problema con tu cuenta de Mercado Pago',
      description:
        connection?.lastError?.trim()
        || 'Necesitas volver a conectar tu cuenta para seguir cobrando reservas online.',
    };
  }

  if (status === 'PENDING_AUTHORIZATION') {
    return {
      badge: 'Autorizacion pendiente',
      title: 'Termina la conexion en Mercado Pago',
      description: 'Cuando completes la autorizacion, vamos a actualizar este estado automaticamente.',
    };
  }

  return {
    badge: 'No conectado',
    title: 'Conecta tu cuenta para cobrar reservas online',
    description:
      'Vincula tu cuenta de Mercado Pago para aceptar pagos de reservas sin mezclarlo con tu plan de Plura.',
  };
};

export const formatMercadoPagoConnectionDate = (value?: string | null) => {
  if (!value) return 'Sin dato';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
