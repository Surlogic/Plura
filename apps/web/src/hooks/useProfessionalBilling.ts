'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { billingPlans, type BillingUiPlanId, type PaidBillingUiPlanId } from '@/config/billingPlans';
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
  { key: 'allowAnalytics', label: 'Analytics' },
  { key: 'allowOnlinePayments', label: 'Pagos online' },
  { key: 'allowAutomations', label: 'Automatizaciones' },
  { key: 'allowLoyalty', label: 'Fidelizacion' },
  { key: 'allowStore', label: 'Tienda' },
  { key: 'allowChat', label: 'Chat' },
  { key: 'allowWhatsappAutomatic', label: 'WhatsApp automatico' },
  { key: 'allowClientReminders', label: 'Recordatorios a clientes' },
  { key: 'allowInAppNotifications', label: 'Notificaciones in-app' },
  { key: 'allowNewBookingNotifications', label: 'Avisos de nuevas reservas' },
  { key: 'allowClientChooseProfessional', label: 'Eleccion de profesional' },
];

const INTENSIVE_POLL_INTERVAL_MS = 5000;
const INTENSIVE_POLL_DURATION_MS = 30000;
const SOFT_POLL_INTERVAL_MS = 15000;
const MAX_PENDING_CHECKOUT_AGE_MS = 5 * 60 * 1000;

const refreshProfessionalCaches = async (refreshProfile: () => Promise<void>) => {
  invalidateCachedGet('/auth/me/profesional');
  invalidateCachedGet('/auth/me/professional');
  await refreshProfile();
};

const buildTrialBanner = (hasPendingCheckout: boolean): BillingBannerState => ({
  tone: 'info',
  title: 'Pago pendiente',
  description: hasPendingCheckout
    ? 'El checkout fue iniciado y seguimos esperando la confirmacion del webhook.'
    : 'El checkout fue iniciado, pero el pago todavia no fue confirmado. Puedes seguir navegando o cambiar de plan.',
});

export function useProfessionalBilling({
  profile,
  refreshProfile,
}: {
  profile?: ProfessionalProfile | null;
  refreshProfile: () => Promise<void>;
}) {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckoutState | null>(() =>
    getPendingCheckoutState(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isPollingCheckout, setIsPollingCheckout] = useState(false);
  const [isRefreshingSubscriptionStatus, setIsRefreshingSubscriptionStatus] = useState(false);
  const [banner, setBanner] = useState<BillingBannerState | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const pollPhaseTimeoutRef = useRef<number | null>(null);
  const isCheckingStatusRef = useRef(false);
  const pendingRetryRef = useRef<BillingStatusCheckSource | null>(null);
  const [pollRestartTrigger, setPollRestartTrigger] = useState(0);

  const loadSubscription = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const nextSubscription = await fetchCurrentSubscription();
      setSubscription(nextSubscription);
    } catch (error) {
      setSubscription(null);
      setBanner({
        tone: 'error',
        title: 'No se pudo cargar facturacion',
        description: resolveBackendMessage(
          error,
          'No se pudo cargar el estado de la suscripcion.',
        ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollPhaseTimeoutRef.current !== null) {
      window.clearTimeout(pollPhaseTimeoutRef.current);
      pollPhaseTimeoutRef.current = null;
    }
  }, []);

  const stopPollingCheckout = useCallback(() => {
    stopPolling();
    setIsPollingCheckout(false);
  }, [stopPolling]);

  const clearPendingCheckout = useCallback(() => {
    clearPendingCheckoutState();
    setPendingCheckout(null);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    void loadSubscription();
  }, [loadSubscription, profile?.id]);

  const currentPlanId = useMemo(
    () =>
      resolveCurrentBillingPlanId({
        profilePlanCode: profile?.planCode,
        subscription,
      }),
    [profile?.planCode, subscription],
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
    if (!profile?.planCapabilities) return [];
    return featureLabels.filter(
      (feature) =>
        Boolean(
          profile.planCapabilities?.[
            feature.key as keyof typeof profile.planCapabilities
          ],
        ),
    );
  }, [profile?.planCapabilities]);

  const handleObservedSubscription = useCallback(async (
    nextSubscription: BillingSubscription | null,
    source: BillingStatusCheckSource,
  ) => {
    if (nextSubscription?.status === 'ACTIVE') {
      clearPendingCheckout();
      stopPollingCheckout();
      setBanner({
        tone: 'success',
        title: 'Suscripcion activada',
        description: 'Tu plan ya esta disponible en el dashboard.',
      });
      await refreshProfessionalCaches(refreshProfile);
      return;
    }

    if (nextSubscription?.status === 'TRIAL') {
      if (source === 'checkout-return') {
        // Webhook hasn't confirmed the payment yet. Keep pendingCheckout and
        // trigger the polling effect to restart (return flag was already cleared).
        setPollRestartTrigger((n) => n + 1);
        setBanner(buildTrialBanner(true));
        return;
      }
      setBanner(buildTrialBanner(pendingCheckout !== null));
      return;
    }

    if (!nextSubscription) {
      if (source === 'checkout-return') {
        // Backend might still be processing (cold start, latency).
        // Keep pendingCheckout and trigger polling to wait for webhook.
        const ageMs = pendingCheckout ? Date.now() - pendingCheckout.createdAt : 0;
        if (ageMs < MAX_PENDING_CHECKOUT_AGE_MS) {
          setPollRestartTrigger((n) => n + 1);
          setBanner({
            tone: 'loading',
            title: 'Procesando pago...',
            description: 'Estamos esperando la confirmacion de Mercado Pago.',
          });
        } else {
          clearPendingCheckout();
          stopPollingCheckout();
          setBanner({
            tone: 'info',
            title: 'Checkout sin confirmar',
            description: 'No vimos un pago confirmado. Puedes seguir navegando o iniciar otro checkout.',
          });
        }
        return;
      }

      setBanner({
        tone: source === 'manual' ? 'info' : 'loading',
        title: source === 'manual' ? 'Seguimos validando el pago' : 'Procesando pago...',
        description: source === 'manual'
          ? 'Todavia no vemos la suscripcion confirmada. Puedes volver a revisar en unos minutos.'
          : 'Estamos esperando la confirmacion del checkout.',
      });
      return;
    }

    if (nextSubscription.status === 'PAST_DUE') {
      clearPendingCheckout();
      stopPollingCheckout();
      setBanner({
        tone: 'warning',
        title: 'Pago fallido',
        description: 'Mercado Pago informo que el cobro no pudo confirmarse. Puedes seguir navegando o iniciar un nuevo checkout.',
      });
      return;
    }

    if (nextSubscription.status === 'CANCELLED') {
      clearPendingCheckout();
      stopPollingCheckout();
      setBanner({
        tone: 'warning',
        title: 'Suscripcion cancelada',
        description: 'La suscripcion fue cancelada. Puedes seguir navegando o iniciar un nuevo checkout.',
      });
    }
  }, [clearPendingCheckout, pendingCheckout, refreshProfile, stopPollingCheckout]);

  const runStatusCheck = useCallback(async (source: BillingStatusCheckSource) => {
    if (isCheckingStatusRef.current) {
      pendingRetryRef.current = source;
      return;
    }

    isCheckingStatusRef.current = true;
    pendingRetryRef.current = null;
    if (source === 'manual') {
      setIsRefreshingSubscriptionStatus(true);
    }

    try {
      const nextSubscription = await fetchCurrentSubscription();
      setSubscription(nextSubscription);
      await handleObservedSubscription(nextSubscription, source);
    } catch (error) {
      if (source === 'manual') {
        setBanner({
          tone: 'error',
          title: 'No se pudo verificar el pago',
          description: resolveBackendMessage(
            error,
            'No pudimos confirmar el estado del checkout.',
          ),
        });
      } else {
        stopPollingCheckout();
        setBanner({
          tone: 'error',
          title: 'No se pudo verificar el pago',
          description: resolveBackendMessage(
            error,
            'No pudimos confirmar el estado del checkout. Puedes volver a verificarlo manualmente.',
          ),
        });
      }
    } finally {
      if (source === 'manual') {
        setIsRefreshingSubscriptionStatus(false);
      }
      isCheckingStatusRef.current = false;

      const retrySource = pendingRetryRef.current;
      if (retrySource) {
        pendingRetryRef.current = null;
        void runStatusCheck(retrySource);
      }
    }
  }, [handleObservedSubscription, stopPollingCheckout]);

  const startSoftPolling = useCallback((remainingMs: number) => {
    stopPolling();

    if (remainingMs <= 0) {
      stopPollingCheckout();
      setBanner({
        tone: 'info',
        title: 'Todavia estamos esperando la confirmacion del pago',
        description: 'Puedes volver a revisar en unos minutos.',
      });
      return;
    }

    setIsPollingCheckout(true);
    setBanner({
      tone: 'info',
      title: 'Seguimos validando el pago',
      description: 'El webhook puede tardar un poco mas.',
    });

    pollIntervalRef.current = window.setInterval(() => {
      void runStatusCheck('polling');
    }, SOFT_POLL_INTERVAL_MS);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stopPollingCheckout();
      setBanner({
        tone: 'info',
        title: 'Todavia estamos esperando la confirmacion del pago',
        description: 'Puedes volver a revisar en unos minutos.',
      });
    }, remainingMs);
  }, [runStatusCheck, stopPolling, stopPollingCheckout]);

  const startIntensivePolling = useCallback((remainingMs: number) => {
    stopPolling();

    if (remainingMs <= 0) {
      const latestPending = getPendingCheckoutState();
      const ageMs = latestPending ? Date.now() - latestPending.createdAt : MAX_PENDING_CHECKOUT_AGE_MS;
      startSoftPolling(Math.max(0, MAX_PENDING_CHECKOUT_AGE_MS - ageMs));
      return;
    }

    setIsPollingCheckout(true);
    setBanner({
      tone: 'loading',
      title: 'Procesando pago...',
      description: 'Estamos esperando la confirmacion de Mercado Pago.',
    });

    pollIntervalRef.current = window.setInterval(() => {
      void runStatusCheck('polling');
    }, INTENSIVE_POLL_INTERVAL_MS);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stopPolling();
      const latestPending = getPendingCheckoutState();
      const ageMs = latestPending ? Date.now() - latestPending.createdAt : MAX_PENDING_CHECKOUT_AGE_MS;
      startSoftPolling(Math.max(0, MAX_PENDING_CHECKOUT_AGE_MS - ageMs));
    }, remainingMs);
  }, [runStatusCheck, startSoftPolling, stopPolling]);

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
      setBanner({
        tone: 'info',
        title: 'Todavia estamos esperando la confirmacion del pago',
        description: 'Puedes volver a revisar en unos minutos.',
      });
      return;
    }

    if (ageMs < INTENSIVE_POLL_DURATION_MS) {
      startIntensivePolling(INTENSIVE_POLL_DURATION_MS - ageMs);
      void runStatusCheck('resume');

      return () => {
        stopPolling();
      };
    }

    startSoftPolling(MAX_PENDING_CHECKOUT_AGE_MS - ageMs);
    void runStatusCheck('resume');

    return () => {
      stopPolling();
    };
  }, [
    pendingCheckout,
    pollRestartTrigger,
    profile?.id,
    runStatusCheck,
    startIntensivePolling,
    startSoftPolling,
    stopPolling,
    stopPollingCheckout,
  ]);

  const handleCheckoutReturn = useCallback(async () => {
    if (!profile?.id || !pendingCheckout || !hasPendingCheckoutReturnState()) return;

    clearPendingCheckoutReturnState();
    await runStatusCheck('checkout-return');
  }, [pendingCheckout, profile?.id, runStatusCheck]);

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
    await runStatusCheck('manual');
  }, [runStatusCheck]);

  const handleSelectPlan = useCallback(async (planId: BillingUiPlanId) => {
    if (planId === 'BASIC') {
      if (!subscription || currentPlanId === 'BASIC' || subscription.cancelAtPeriodEnd) return;

      const isMercadoPago = subscription.provider?.toUpperCase() === 'MERCADOPAGO';
      const confirmMessage = isMercadoPago
        ? 'La suscripcion se cancelara de inmediato y volveras a BASIC. ¿Deseas continuar?'
        : 'Tu suscripcion seguira activa hasta el fin del periodo actual y luego volvera a BASIC.';
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;

      setIsCancelling(true);
      setBanner(null);

      try {
        const nextSubscription = await cancelBillingSubscription();
        setSubscription(nextSubscription);
        await refreshProfessionalCaches(refreshProfile);
        setBanner({
          tone: 'success',
          title: isMercadoPago ? 'Suscripcion cancelada' : 'Cambio a BASIC programado',
          description: isMercadoPago
            ? 'Tu suscripcion fue cancelada y ahora estas en el plan BASIC.'
            : nextSubscription.currentPeriodEnd
              ? `Tu plan superior seguira activo hasta ${formatBillingDate(nextSubscription.currentPeriodEnd)}.`
              : 'La suscripcion quedo marcada para volver a BASIC al final del periodo.',
        });
      } catch (error) {
        setBanner({
          tone: 'error',
          title: 'No se pudo cambiar a BASIC',
          description: resolveBackendMessage(
            error,
            'No se pudo cancelar la suscripcion actual.',
          ),
        });
      } finally {
        setIsCancelling(false);
      }
      return;
    }

    setIsRedirectingToCheckout(true);
    setBanner({
      tone: 'loading',
      title: 'Procesando pago...',
      description: 'Te estamos redirigiendo a Mercado Pago.',
    });

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
      setBanner({
        tone: 'error',
        title: 'No se pudo iniciar el checkout',
        description: resolveBackendMessage(
          error,
          'No se pudo crear la sesion de pago.',
        ),
      });
      setIsRedirectingToCheckout(false);
    }
  }, [currentPlanId, refreshProfile, subscription]);

  const dismissBanner = useCallback(() => {
    setBanner(null);
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
    banner,
    isLoading,
    isCancelling,
    isRedirectingToCheckout,
    isPollingCheckout,
    isRefreshingSubscriptionStatus,
    hasPendingCheckout: pendingCheckout !== null,
    handleSelectPlan,
    dismissBanner,
    refreshSubscriptionStatus,
    reloadSubscription: loadSubscription,
  };
}
