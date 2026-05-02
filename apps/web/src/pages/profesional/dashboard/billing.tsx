'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import BillingCurrentPlanCard from '@/components/billing/BillingCurrentPlanCard';
import BillingFeatureComparison from '@/components/billing/BillingFeatureComparison';
import BillingPlansGrid from '@/components/billing/BillingPlansGrid';
import BillingStatusBanner from '@/components/billing/BillingStatusBanner';
import MercadoPagoConnectionCard from '@/components/billing/MercadoPagoConnectionCard';
import MercadoPagoUpgradeCard from '@/components/billing/MercadoPagoUpgradeCard';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import { useProfessionalMercadoPagoConnection } from '@/hooks/useProfessionalMercadoPagoConnection';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalBilling } from '@/hooks/useProfessionalBilling';

export default function ProfesionalBillingPage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const plansRef = useRef<HTMLDivElement | null>(null);
  const planDetailsRef = useRef<HTMLDivElement | null>(null);
  const paymentsSectionRef = useRef<HTMLElement | null>(null);
  const [showDeferredPlanDetails, setShowDeferredPlanDetails] = useState(false);
  const [showPaymentsSection, setShowPaymentsSection] = useState(false);
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const canUseOnlinePayments = featureAccess.onlinePayments;
  const shouldLoadMercadoPagoConnection =
    Boolean(profile?.id)
    && canUseOnlinePayments
    && showPaymentsSection;

  const {
    subscription,
    currentPlan,
    currentPlanId,
    currentStatus,
    currentStatusLabel,
    currentStatusClassName,
    renewalLabel,
    currentAmountLabel,
    enabledCapabilities,
    plans,
    banner,
    isLoading: isLoadingBilling,
    isCancelling,
    isRedirectingToCheckout,
    hasPendingCheckout,
    isRefreshingSubscriptionStatus,
    handleSelectPlan,
    dismissBanner,
    refreshSubscriptionStatus,
  } = useProfessionalBilling({
    profile,
    refreshProfile,
  });

  const {
    connection,
    banner: connectionBanner,
    isLoading: isLoadingConnection,
    isStartingOAuth,
    isDisconnecting,
    startOAuth,
    disconnect,
    reloadConnection,
    dismissBanner: dismissConnectionBanner,
  } = useProfessionalMercadoPagoConnection(
    shouldLoadMercadoPagoConnection,
  );

  const connectionCopy = getMercadoPagoConnectionStatusCopy(connection);
  const mercadoPagoBadge = canUseOnlinePayments ? connectionCopy.badge : 'Disponible desde Pro';
  const mercadoPagoTitle = canUseOnlinePayments
    ? connectionCopy.title
    : 'Tu plan actual no habilita cobros online';

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  useEffect(() => {
    if (showDeferredPlanDetails) return undefined;
    if (typeof window === 'undefined') return undefined;

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const reveal = () => setShowDeferredPlanDetails(true);

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => reveal(), { timeout: 300 });
    } else {
      timeoutId = window.setTimeout(reveal, 180);
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [showDeferredPlanDetails]);

  useEffect(() => {
    if (showPaymentsSection || !canUseOnlinePayments) {
      if (!canUseOnlinePayments) {
        setShowPaymentsSection(true);
      }
      return undefined;
    }

    const section = paymentsSectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setShowPaymentsSection(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShowPaymentsSection(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [canUseOnlinePayments, showPaymentsSection]);

  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleDisconnectMercadoPago = useCallback(async () => {
    const confirmed = window.confirm(
      'Vas a desconectar tu cuenta de Mercado Pago para cobros de reservas. ¿Querés continuar?',
    );
    if (!confirmed) return;
    await disconnect();
  }, [disconnect]);

  const handleCancelPlan = useCallback(() => {
    void handleSelectPlan('BASIC');
  }, [handleSelectPlan]);

  const handleVerifyBillingStatus = useCallback(() => {
    void refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const handleSelectBillingPlan = useCallback((planId: typeof currentPlanId) => {
    void handleSelectPlan(planId);
  }, [handleSelectPlan]);

  const handleStartMercadoPagoOAuth = useCallback(() => {
    void startOAuth();
  }, [startOAuth]);

  const handleRefreshMercadoPagoConnection = useCallback(() => {
    void reloadConnection();
  }, [reloadConnection]);

  const handleDisconnectMercadoPagoConnection = useCallback(() => {
    void handleDisconnectMercadoPago();
  }, [handleDisconnectMercadoPago]);

  return (
    <ProfessionalDashboardShell profile={profile} active="Facturación">
      <div className="space-y-6">
              <DashboardPageHeader
                eyebrow="Facturación"
                title="Facturación y cobros"
                description="Mantené separado el plan de Plura de la cuenta de Mercado Pago usada para cobrar reservas."
                meta={
                  <>
                    <DashboardHeaderBadge tone="accent">
                      Plan {currentPlan.label}
                    </DashboardHeaderBadge>
                    <DashboardHeaderBadge tone={connection?.connected ? 'success' : 'default'}>
                      Cobros: {mercadoPagoBadge}
                    </DashboardHeaderBadge>
                  </>
                }
                actions={
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatusClassName}`}>
                    {currentStatusLabel}
                  </span>
                }
              />

              {banner ? (
                <BillingStatusBanner
                  banner={banner}
                  onDismiss={banner.tone === 'loading' ? undefined : dismissBanner}
                />
              ) : null}

              {connectionBanner ? (
                <div className={`rounded-[18px] border px-4 py-3 text-sm ${
                  connectionBanner.tone === 'success'
                    ? 'border-[#BFEDE7] bg-[#F0FDFA] text-[#0F766E]'
                    : connectionBanner.tone === 'error'
                      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                      : 'border-[#D9E6F2] bg-[#F8FBFF] text-[#1D4ED8]'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{connectionBanner.title}</p>
                      <p className="mt-1">{connectionBanner.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissConnectionBanner}
                      className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : null}

              {showSkeleton ? (
                <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                  <div className="h-5 w-48 rounded-full bg-[#E2E7EC]" />
                  <div className="mt-4 space-y-3">
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DashboardStatCard
                      label="Plan actual"
                      value={currentPlan.label}
                      detail="Tu nivel vigente dentro de Plura"
                      icon="plan"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Suscripción"
                      value={currentStatusLabel}
                      detail={subscription?.cancelAtPeriodEnd ? 'Cancelación al fin del período' : 'Estado comercial del plan'}
                      icon={currentStatus === 'ACTIVE' || currentStatus === 'NONE' ? 'spark' : 'warning'}
                      tone={currentStatus === 'ACTIVE' || currentStatus === 'NONE' ? 'default' : 'warm'}
                    />
                    <DashboardStatCard
                      label="Mercado Pago"
                      value={mercadoPagoBadge}
                      detail={mercadoPagoTitle}
                      icon={canUseOnlinePayments && connection?.connected ? 'check' : canUseOnlinePayments && connectionCopy.tone === 'error' ? 'warning' : 'plan'}
                      tone={canUseOnlinePayments && connection?.connected ? 'accent' : canUseOnlinePayments && connectionCopy.tone === 'error' ? 'warm' : 'default'}
                    />
                    <DashboardStatCard
                      label="Capacidades activas"
                      value={String(enabledCapabilities.length)}
                      detail="Funciones habilitadas por tu plan"
                      icon="reservas"
                      tone="default"
                    />
                  </div>

                  <section ref={planDetailsRef} className="space-y-4">
                    <DashboardSectionHeading
                      title="Mi plan de Plura"
                      description="Esta sección representa tu suscripción a Plura. No mezcla la cuenta que usás para cobrar reservas."
                    />

                    <BillingCurrentPlanCard
                      plan={currentPlan}
                      amountLabel={currentAmountLabel}
                      statusLabel={currentStatusLabel}
                      statusClassName={currentStatusClassName}
                      renewalLabel={renewalLabel}
                      providerLabel={subscription?.provider || 'No aplica'}
                      cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
                      canCancel={
                        Boolean(subscription)
                        && currentPlanId !== 'BASIC'
                        && currentStatus !== 'CANCELLED'
                        && !subscription?.cancelAtPeriodEnd
                      }
                      isCancelling={isCancelling}
                      capabilities={enabledCapabilities.map((feature) => feature.label)}
                      showVerifyStatusButton={hasPendingCheckout}
                      isVerifyingStatus={isRefreshingSubscriptionStatus}
                      onCancel={handleCancelPlan}
                      onBrowsePlans={scrollToPlans}
                      onVerifyStatus={handleVerifyBillingStatus}
                    />

                    {showDeferredPlanDetails ? (
                      <>
                        <BillingFeatureComparison currentPlanId={currentPlanId} />

                        <section
                          id="billing-plans"
                          ref={plansRef}
                          className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
                        >
                          <DashboardSectionHeading
                            title="Planes disponibles"
                            description="Free funciona como base gratuita. Pro y Premium abren checkout en Mercado Pago para la suscripción de Plura."
                            action={isLoadingBilling ? (
                              <span className="text-xs font-semibold text-[#94A3B8]">
                                Cargando...
                              </span>
                            ) : null}
                          />

                          <div className="mt-5">
                            <BillingPlansGrid
                              plans={plans}
                              currentPlanId={currentPlanId}
                              currentSubscriptionStatus={currentStatus}
                              cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
                              isBusy={isCancelling || isRedirectingToCheckout}
                              onSelectPlan={handleSelectBillingPlan}
                            />
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                        <div className="h-5 w-40 rounded-full bg-[#E2E7EC]" />
                        <div className="mt-4 space-y-3">
                          <div className="h-24 rounded-[20px] bg-[#F1F5F9]" />
                          <div className="h-40 rounded-[20px] bg-[#F1F5F9]" />
                        </div>
                      </div>
                    )}
                  </section>

                  <section ref={paymentsSectionRef} className="space-y-4">
                    <DashboardSectionHeading
                      title="Cobros de reservas con Mercado Pago"
                      description={canUseOnlinePayments
                        ? 'Esta sección representa la cuenta del profesional para cobrar reservas online. No cambia tu plan de Plura.'
                        : 'Esta sección queda disponible cuando tu plan habilita pagos online. No cambia tu suscripción a Plura.'}
                    />

                    {canUseOnlinePayments ? (
                      showPaymentsSection ? (
                        <MercadoPagoConnectionCard
                          connection={connection}
                          isLoading={isLoadingConnection}
                          isStartingOAuth={isStartingOAuth}
                          isDisconnecting={isDisconnecting}
                          onConnect={handleStartMercadoPagoOAuth}
                          onDisconnect={handleDisconnectMercadoPagoConnection}
                          onRefresh={handleRefreshMercadoPagoConnection}
                        />
                      ) : (
                        <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                          <div className="h-5 w-56 rounded-full bg-[#E2E7EC]" />
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div className="h-24 rounded-[20px] bg-[#F1F5F9]" />
                            <div className="h-24 rounded-[20px] bg-[#F1F5F9]" />
                            <div className="h-24 rounded-[20px] bg-[#F1F5F9]" />
                          </div>
                        </div>
                      )
                    ) : (
                      <MercadoPagoUpgradeCard
                        currentPlanLabel={currentPlan.label}
                        onBrowsePlans={scrollToPlans}
                      />
                    )}
                  </section>
                </div>
              )}
      </div>
    </ProfessionalDashboardShell>
  );
}
