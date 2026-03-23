'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  billingPlans,
  resolveBillingPlanFromBackendPlanCode,
  resolveBillingPlanFromProfilePlanCode,
  type BillingUiPlanId,
  type PaidBillingUiPlanId,
} from '@/config/billingPlans';
import {
  armPendingCheckoutReturnState,
  billingStatusClassNames,
  billingStatusLabels,
  cancelBillingSubscription,
  clearPendingCheckoutState,
  clearPendingCheckoutReturnState,
  createBillingCheckout,
  fetchCurrentSubscription,
  formatBillingAmount,
  formatBillingDate,
  getPendingCheckoutState,
  hasPendingCheckoutReturnState,
  resolveBackendMessage,
  resolveCurrentBillingPlanId,
  resolveCurrentBillingStatus,
  setPendingCheckoutState,
  type BillingSubscription,
} from '@/lib/billing/billing';
import { invalidateCachedGet } from '@/services/cachedGet';
import type { ProfessionalProfile } from '@/types/professional';

type BannerTone = 'info' | 'success' | 'warning' | 'error' | 'loading';
type PendingCheckoutState = NonNullable<ReturnType<typeof getPendingCheckoutState>>;
type BillingStatusCheckSource = 'polling' | 'manual' | 'resume' | 'checkout-return';

export type BillingBannerState = {
  tone: BannerTone;
  title: string;
  description: string;
};

const featureLabels: Array<{ key: string; label: string }> = [
  { key: 'analyticsTier', label: 'Analytics' },
  { key: 'allowOnlinePayments', label: 'Pagos online' },
  { key: 'allowAutomations', label: 'Automatizaciones' },
  { key: 'allowLoyalty', label: 'Fidelizacion' },
  { key: 'allowStore', label: 'Tienda' },
  { key: 'allowInternalChat', label: 'Chat' },
  { key: 'allowClientProfile', label: 'Ficha de cliente' },
  { key: 'allowVisitHistory', label: 'Historial de visitas' },
  { key: 'allowPortfolio', label: 'Portfolio visual' },
];

const INTENSIVE_POLL_BASE_MS = 5000;
const INTENSIVE_POLL_MAX_MS = 15000;
const INTENSIVE_POLL_DURATION_MS = 30000;
const SOFT_POLL_BASE_MS = 15000;
const SOFT_POLL_MAX_MS = 45000;
const MAX_POLL_ATTEMPTS = 20;
const MAX_PENDING_CHECKOUT_AGE_MS = 5 * 60 * 1000;

const refreshProfessionalCaches = async (refreshProfile: () => Promise<void>) => {
  invalidateCachedGet('/auth/me/profesional');
  await refreshProfile();
};

const buildTrialBanner = (hasPendingCheckout: boolean): BillingBannerState => ({
  tone: 'info',
  title: 'Pago pendiente',
  description: hasPendingCheckout
    ? 'El checkout fue iniciado y seguimos esperando la confirmacion del webhook.'
    : 'El checkout fue iniciado, pero el pago todavia no fue confirmado. Puedes seguir navegando o cambiar de plan.',
});

// --- Consolidated UI state via useReducer ---

type BillingUiState = {
  isLoading: boolean;
  isCancelling: boolean;
  isRedirectingToCheckout: boolean;
  isPollingCheckout: boolean;
  isRefreshingSubscriptionStatus: boolean;
  banner: BillingBannerState | null;
};

type BillingUiAction =
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_CANCELLING'; value: boolean }
  | { type: 'SET_REDIRECTING'; value: boolean }
  | { type: 'SET_POLLING'; value: boolean }
  | { type: 'SET_REFRESHING_STATUS'; value: boolean }
  | { type: 'SET_BANNER'; banner: BillingBannerState | null }
  | { type: 'STOP_POLLING_WITH_BANNER'; banner: BillingBannerState | null }
  | { type: 'CANCEL_START' }
  | { type: 'CANCEL_END'; banner: BillingBannerState | null }
  | { type: 'CHECKOUT_REDIRECT_START' }
  | { type: 'CHECKOUT_REDIRECT_FAIL'; banner: BillingBannerState };

const initialUiState: BillingUiState = {
  isLoading: false,
  isCancelling: false,
  isRedirectingToCheckout: false,
  isPollingCheckout: false,
  isRefreshingSubscriptionStatus: false,
  banner: null,
};

function billingUiReducer(state: BillingUiState, action: BillingUiAction): BillingUiState {
  switch (action.type) {
    case 'SET_LOADING':
      return state.isLoading === action.value ? state : { ...state, isLoading: action.value };
    case 'SET_CANCELLING':
      return state.isCancelling === action.value ? state : { ...state, isCancelling: action.value };
    case 'SET_REDIRECTING':
      return state.isRedirectingToCheckout === action.value ? state : { ...state, isRedirectingToCheckout: action.value };
    case 'SET_POLLING':
      return state.isPollingCheckout === action.value ? state : { ...state, isPollingCheckout: action.value };
    case 'SET_REFRESHING_STATUS':
      return state.isRefreshingSubscriptionStatus === action.value ? state : { ...state, isRefreshingSubscriptionStatus: action.value };
    case 'SET_BANNER':
      return { ...state, banner: action.banner };
    case 'STOP_POLLING_WITH_BANNER':
      return { ...state, isPollingCheckout: false, banner: action.banner };
    case 'CANCEL_START':
      return { ...state, isCancelling: true, banner: null };
    case 'CANCEL_END':
      return { ...state, isCancelling: false, banner: action.banner };
    case 'CHECKOUT_REDIRECT_START':
      return {
        ...state,
        isRedirectingToCheckout: true,
        banner: { tone: 'loading', title: 'Procesando pago...', description: 'Te estamos redirigiendo a Mercado Pago.' },
      };
    case 'CHECKOUT_REDIRECT_FAIL':
      return { ...state, isRedirectingToCheckout: false, banner: action.banner };
    default:
      return state;
  }
}

export function useProfessionalBilling({
  profile,
  refreshProfile,
}: {
  profile?: ProfessionalProfile | null;
  refreshProfile: () => Promise<void>;
}) {
  const [ui, dispatch] = useReducer(billingUiReducer, initialUiState);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckoutState | null>(() =>
    getPendingCheckoutState(),
  );
  const pollTimeoutRef = useRef<number | null>(null);
  const pollPhaseTimeoutRef = useRef<number | null>(null);
  const isCheckingStatusRef = useRef(false);
  const pollAttemptRef = useRef(0);
  const pendingRetryRef = useRef<BillingStatusCheckSource | null>(null);
  const [pollRestartTrigger, setPollRestartTrigger] = useState(0);
  const profileSyncSignatureRef = useRef<string | null>(null);
  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  const loadSubscription = useCallback(async () => {
    if (!profile?.id) return;
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const nextSubscription = await fetchCurrentSubscription();
      setSubscription(nextSubscription);
    } catch (error) {
      setSubscription(null);
      dispatch({
        type: 'SET_BANNER',
        banner: {
          tone: 'error',
          title: 'No se pudo cargar facturacion',
          description: resolveBackendMessage(error, 'No se pudo cargar el estado de la suscripcion.'),
        },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }, [profile?.id]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (pollPhaseTimeoutRef.current !== null) {
      window.clearTimeout(pollPhaseTimeoutRef.current);
      pollPhaseTimeoutRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  const stopPollingCheckout = useCallback(() => {
    stopPolling();
    dispatch({ type: 'SET_POLLING', value: false });
  }, [stopPolling]);

  const clearPendingCheckout = useCallback(() => {
    clearPendingCheckoutState();
    setPendingCheckout(null);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    void loadSubscription();
  }, [loadSubscription, profile?.id]);

  useEffect(() => {
    if (!profile?.id || !subscription || subscription.status !== 'ACTIVE') {
      profileSyncSignatureRef.current = null;
      return;
    }

    const subscriptionPlanId = resolveBillingPlanFromBackendPlanCode(subscription.planCode);
    const profilePlanId = resolveBillingPlanFromProfilePlanCode(profile?.professionalPlan);
    const missingOnlinePaymentsEntitlement =
      subscriptionPlanId !== null
      && subscriptionPlanId !== 'BASIC'
      && !profile?.professionalEntitlements?.allowOnlinePayments;

    if (subscriptionPlanId === null || (subscriptionPlanId === profilePlanId && !missingOnlinePaymentsEntitlement)) {
      profileSyncSignatureRef.current = null;
      return;
    }

    const signature = `${profile.id}:${subscription.subscriptionId}:${subscription.status}:${subscription.planCode}`;
    if (profileSyncSignatureRef.current === signature) {
      return;
    }
    profileSyncSignatureRef.current = signature;
    void refreshProfessionalCaches(refreshProfileRef.current);
  }, [
    profile?.id,
    profile?.professionalEntitlements?.allowOnlinePayments,
    profile?.professionalPlan,
    subscription,
  ]);

  const currentPlanId = useMemo(
    () =>
      resolveCurrentBillingPlanId({
        profilePlanCode: profile?.professionalPlan,
        subscription,
      }),
    [profile?.professionalPlan, subscription],
  );

  const currentPlan = useMemo(
    () => billingPlans.find((plan) => plan.id === currentPlanId) || billingPlans[0],
    [currentPlanId],
  );

  const currentStatus = useMemo(
    () => resolveCurrentBillingStatus(subscription),
    [subscription],
  );

  const renewalLabel = useMemo(() => {
    if (currentPlanId === 'BASIC' && !subscription) return 'No aplica';
    if (subscription?.cancelAtPeriodEnd) {
      return subscription.currentPeriodEnd
        ? `Finaliza el ${formatBillingDate(subscription.currentPeriodEnd)}`
        : 'Cancelacion programada';
    }
    return formatBillingDate(subscription?.currentPeriodEnd);
  }, [currentPlanId, subscription]);

  const currentAmountLabel = useMemo(() => {
    if (currentPlanId === 'BASIC') {
      return currentPlan.priceLabel;
    }
    return formatBillingAmount(
      subscription?.amount ?? currentPlan.priceMonthly,
      subscription?.currency || 'UYU',
    );
  }, [currentPlan, currentPlanId, subscription]);

  const enabledCapabilities = useMemo(() => {
    const entitlements = profile?.professionalEntitlements;
    if (!entitlements) return [];
    return featureLabels.filter((feature) => {
      if (feature.key === 'analyticsTier') {
        return entitlements.analyticsTier !== 'NONE';
      }
      return Boolean(
        entitlements[feature.key as keyof typeof entitlements],
      );
    });
  }, [profile?.professionalEntitlements]);

  const pendingCheckoutRef = useRef(pendingCheckout);
  pendingCheckoutRef.current = pendingCheckout;

  const handleObservedSubscription = useCallback(async (
    nextSubscription: BillingSubscription | null,
    source: BillingStatusCheckSource,
  ) => {
    if (nextSubscription?.status === 'ACTIVE') {
      clearPendingCheckout();
      stopPollingCheckout();
      dispatch({
        type: 'SET_BANNER',
        banner: { tone: 'success', title: 'Suscripcion activada', description: 'Tu plan ya esta disponible en el dashboard.' },
      });
      await refreshProfessionalCaches(refreshProfileRef.current);
      return;
    }

    if (nextSubscription?.status === 'TRIAL') {
      if (source === 'checkout-return') {
        setPollRestartTrigger((n) => n + 1);
        dispatch({ type: 'SET_BANNER', banner: buildTrialBanner(true) });
        return;
      }
      dispatch({ type: 'SET_BANNER', banner: buildTrialBanner(pendingCheckoutRef.current !== null) });
      return;
    }

    if (!nextSubscription) {
      if (source === 'checkout-return') {
        const ageMs = pendingCheckoutRef.current ? Date.now() - pendingCheckoutRef.current.createdAt : 0;
        if (ageMs < MAX_PENDING_CHECKOUT_AGE_MS) {
          setPollRestartTrigger((n) => n + 1);
          dispatch({
            type: 'SET_BANNER',
            banner: { tone: 'loading', title: 'Procesando pago...', description: 'Estamos esperando la confirmacion de Mercado Pago.' },
          });
        } else {
          clearPendingCheckout();
          stopPollingCheckout();
          dispatch({
            type: 'SET_BANNER',
            banner: { tone: 'info', title: 'Checkout sin confirmar', description: 'No vimos un pago confirmado. Puedes seguir navegando o iniciar otro checkout.' },
          });
        }
        return;
      }

      dispatch({
        type: 'SET_BANNER',
        banner: {
          tone: source === 'manual' ? 'info' : 'loading',
          title: source === 'manual' ? 'Seguimos validando el pago' : 'Procesando pago...',
          description: source === 'manual'
            ? 'Todavia no vemos la suscripcion confirmada. Puedes volver a revisar en unos minutos.'
            : 'Estamos esperando la confirmacion del checkout.',
        },
      });
      return;
    }

    if (nextSubscription.status === 'PAST_DUE') {
      clearPendingCheckout();
      dispatch({
        type: 'STOP_POLLING_WITH_BANNER',
        banner: { tone: 'warning', title: 'Pago fallido', description: 'Mercado Pago informo que el cobro no pudo confirmarse. Puedes seguir navegando o iniciar un nuevo checkout.' },
      });
      stopPolling();
      return;
    }

    if (nextSubscription.status === 'CANCELLED') {
      clearPendingCheckout();
      dispatch({
        type: 'STOP_POLLING_WITH_BANNER',
        banner: { tone: 'warning', title: 'Suscripcion cancelada', description: 'La suscripcion fue cancelada. Puedes seguir navegando o iniciar un nuevo checkout.' },
      });
      stopPolling();
    }
  }, [clearPendingCheckout, stopPolling, stopPollingCheckout]);

  const handleObservedSubscriptionRef = useRef(handleObservedSubscription);
  handleObservedSubscriptionRef.current = handleObservedSubscription;

  const runStatusCheck = useCallback(async (source: BillingStatusCheckSource) => {
    if (isCheckingStatusRef.current) {
      pendingRetryRef.current = source;
      return;
    }

    isCheckingStatusRef.current = true;
    pendingRetryRef.current = null;
    if (source === 'manual') {
      dispatch({ type: 'SET_REFRESHING_STATUS', value: true });
    }

    try {
      const nextSubscription = await fetchCurrentSubscription();
      setSubscription(nextSubscription);
      await handleObservedSubscriptionRef.current(nextSubscription, source);
    } catch (error) {
      if (source === 'manual') {
        dispatch({
          type: 'SET_BANNER',
          banner: {
            tone: 'error',
            title: 'No se pudo verificar el pago',
            description: resolveBackendMessage(error, 'No pudimos confirmar el estado del checkout.'),
          },
        });
      } else {
        stopPollingCheckout();
        dispatch({
          type: 'SET_BANNER',
          banner: {
            tone: 'error',
            title: 'No se pudo verificar el pago',
            description: resolveBackendMessage(error, 'No pudimos confirmar el estado del checkout. Puedes volver a verificarlo manualmente.'),
          },
        });
      }
    } finally {
      if (source === 'manual') {
        dispatch({ type: 'SET_REFRESHING_STATUS', value: false });
      }
      isCheckingStatusRef.current = false;

      const retrySource = pendingRetryRef.current;
      if (retrySource) {
        pendingRetryRef.current = null;
        void runStatusCheck(retrySource);
      }
    }
  }, [stopPollingCheckout]);

  const runStatusCheckRef = useRef(runStatusCheck);
  runStatusCheckRef.current = runStatusCheck;

  const schedulePollWithBackoff = useCallback((baseMs: number, maxMs: number) => {
    if (pollTimeoutRef.current !== null) return;
    if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
      dispatch({
        type: 'STOP_POLLING_WITH_BANNER',
        banner: { tone: 'info', title: 'Todavia estamos esperando la confirmacion del pago', description: 'Puedes volver a revisar en unos minutos.' },
      });
      return;
    }
    const delay = Math.min(maxMs, baseMs * Math.pow(1.5, pollAttemptRef.current));
    pollAttemptRef.current += 1;
    pollTimeoutRef.current = window.setTimeout(async () => {
      pollTimeoutRef.current = null;
      await runStatusCheckRef.current('polling');
      schedulePollWithBackoff(baseMs, maxMs);
    }, delay);
  }, []);

  const startSoftPolling = useCallback((remainingMs: number) => {
    stopPolling();

    if (remainingMs <= 0) {
      dispatch({
        type: 'STOP_POLLING_WITH_BANNER',
        banner: { tone: 'info', title: 'Todavia estamos esperando la confirmacion del pago', description: 'Puedes volver a revisar en unos minutos.' },
      });
      return;
    }

    dispatch({ type: 'SET_POLLING', value: true });
    dispatch({
      type: 'SET_BANNER',
      banner: { tone: 'info', title: 'Seguimos validando el pago', description: 'El webhook puede tardar un poco mas.' },
    });

    schedulePollWithBackoff(SOFT_POLL_BASE_MS, SOFT_POLL_MAX_MS);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stopPollingCheckout();
      dispatch({
        type: 'SET_BANNER',
        banner: { tone: 'info', title: 'Todavia estamos esperando la confirmacion del pago', description: 'Puedes volver a revisar en unos minutos.' },
      });
    }, remainingMs);
  }, [schedulePollWithBackoff, stopPolling, stopPollingCheckout]);

  const startSoftPollingRef = useRef(startSoftPolling);
  startSoftPollingRef.current = startSoftPolling;

  const startIntensivePolling = useCallback((remainingMs: number) => {
    stopPolling();

    if (remainingMs <= 0) {
      const latestPending = getPendingCheckoutState();
      const ageMs = latestPending ? Date.now() - latestPending.createdAt : MAX_PENDING_CHECKOUT_AGE_MS;
      startSoftPollingRef.current(Math.max(0, MAX_PENDING_CHECKOUT_AGE_MS - ageMs));
      return;
    }

    dispatch({ type: 'SET_POLLING', value: true });
    dispatch({
      type: 'SET_BANNER',
      banner: { tone: 'loading', title: 'Procesando pago...', description: 'Estamos esperando la confirmacion de Mercado Pago.' },
    });

    schedulePollWithBackoff(INTENSIVE_POLL_BASE_MS, INTENSIVE_POLL_MAX_MS);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stopPolling();
      const latestPending = getPendingCheckoutState();
      const ageMs = latestPending ? Date.now() - latestPending.createdAt : MAX_PENDING_CHECKOUT_AGE_MS;
      startSoftPollingRef.current(Math.max(0, MAX_PENDING_CHECKOUT_AGE_MS - ageMs));
    }, remainingMs);
  }, [schedulePollWithBackoff, stopPolling]);

  const startIntensivePollingRef = useRef(startIntensivePolling);
  startIntensivePollingRef.current = startIntensivePolling;

  useEffect(() => {
    if (!profile?.id || !pendingCheckout) {
      stopPollingCheckout();
      return;
    }

    if (hasPendingCheckoutReturnState()) {
      stopPollingCheckout();
      return;
    }

    const ageMs = Date.now() - pendingCheckout.createdAt;

    if (ageMs >= MAX_PENDING_CHECKOUT_AGE_MS) {
      stopPollingCheckout();
      dispatch({
        type: 'SET_BANNER',
        banner: { tone: 'info', title: 'Todavia estamos esperando la confirmacion del pago', description: 'Puedes volver a revisar en unos minutos.' },
      });
      return;
    }

    if (ageMs < INTENSIVE_POLL_DURATION_MS) {
      startIntensivePollingRef.current(INTENSIVE_POLL_DURATION_MS - ageMs);
      void runStatusCheckRef.current('resume');

      return () => {
        stopPolling();
      };
    }

    startSoftPollingRef.current(MAX_PENDING_CHECKOUT_AGE_MS - ageMs);
    void runStatusCheckRef.current('resume');

    return () => {
      stopPolling();
    };
  }, [
    pendingCheckout,
    pollRestartTrigger,
    profile?.id,
    stopPolling,
    stopPollingCheckout,
  ]);

  const handleCheckoutReturn = useCallback(async () => {
    if (!profile?.id || !pendingCheckoutRef.current || !hasPendingCheckoutReturnState()) return;

    clearPendingCheckoutReturnState();
    await runStatusCheckRef.current('checkout-return');
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !pendingCheckout) return;

    const resumeCheckoutOnShow = () => {
      void handleCheckoutReturn();
    };

    void handleCheckoutReturn();
    window.addEventListener('pageshow', resumeCheckoutOnShow);

    return () => {
      window.removeEventListener('pageshow', resumeCheckoutOnShow);
    };
  }, [handleCheckoutReturn, pendingCheckout, profile?.id]);

  const refreshSubscriptionStatus = useCallback(async () => {
    await runStatusCheckRef.current('manual');
  }, []);

  const handleSelectPlan = useCallback(async (planId: BillingUiPlanId) => {
    if (planId === 'BASIC') {
      if (!subscription || currentPlanId === 'BASIC' || subscription.cancelAtPeriodEnd) return;

      const isMercadoPago = subscription.provider?.toUpperCase() === 'MERCADOPAGO';
      const confirmMessage = isMercadoPago
        ? 'La suscripcion se cancelara de inmediato y volveras a BASIC. ¿Deseas continuar?'
        : 'Tu suscripcion seguira activa hasta el fin del periodo actual y luego volvera a BASIC.';
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;

      dispatch({ type: 'CANCEL_START' });

      try {
        const nextSubscription = await cancelBillingSubscription();
        setSubscription(nextSubscription);
        await refreshProfessionalCaches(refreshProfileRef.current);
        dispatch({
          type: 'CANCEL_END',
          banner: {
            tone: 'success',
            title: isMercadoPago ? 'Suscripcion cancelada' : 'Cambio a BASIC programado',
            description: isMercadoPago
              ? 'Tu suscripcion fue cancelada y ahora estas en el plan BASIC.'
              : nextSubscription.currentPeriodEnd
                ? `Tu plan superior seguira activo hasta ${formatBillingDate(nextSubscription.currentPeriodEnd)}.`
                : 'La suscripcion quedo marcada para volver a BASIC al final del periodo.',
          },
        });
      } catch (error) {
        dispatch({
          type: 'CANCEL_END',
          banner: {
            tone: 'error',
            title: 'No se pudo cambiar a BASIC',
            description: resolveBackendMessage(error, 'No se pudo cancelar la suscripcion actual.'),
          },
        });
      }
      return;
    }

    dispatch({ type: 'CHECKOUT_REDIRECT_START' });

    try {
      const response = await createBillingCheckout(planId as PaidBillingUiPlanId);
      const nextPendingCheckout = {
        planId: planId as PaidBillingUiPlanId,
        createdAt: Date.now(),
      };
      setPendingCheckoutState(nextPendingCheckout);
      armPendingCheckoutReturnState();
      setPendingCheckout(nextPendingCheckout);
      window.location.href = response.checkoutUrl;
    } catch (error) {
      dispatch({
        type: 'CHECKOUT_REDIRECT_FAIL',
        banner: {
          tone: 'error',
          title: 'No se pudo iniciar el checkout',
          description: resolveBackendMessage(error, 'No se pudo crear la sesion de pago.'),
        },
      });
    }
  }, [currentPlanId, subscription]);

  const dismissBanner = useCallback(() => {
    dispatch({ type: 'SET_BANNER', banner: null });
  }, []);

  return {
    subscription,
    currentPlan,
    currentPlanId,
    currentStatus,
    currentStatusLabel: billingStatusLabels[currentStatus],
    currentStatusClassName: billingStatusClassNames[currentStatus],
    renewalLabel,
    currentAmountLabel,
    enabledCapabilities,
    plans: billingPlans,
    banner: ui.banner,
    isLoading: ui.isLoading,
    isCancelling: ui.isCancelling,
    isRedirectingToCheckout: ui.isRedirectingToCheckout,
    isPollingCheckout: ui.isPollingCheckout,
    isRefreshingSubscriptionStatus: ui.isRefreshingSubscriptionStatus,
    hasPendingCheckout: pendingCheckout !== null,
    handleSelectPlan,
    dismissBanner,
    refreshSubscriptionStatus,
    reloadSubscription: loadSubscription,
  };
}
