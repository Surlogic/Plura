'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import BillingCurrentPlanCard from '@/components/billing/BillingCurrentPlanCard';
import BillingFeatureComparison from '@/components/billing/BillingFeatureComparison';
import BillingPlansGrid from '@/components/billing/BillingPlansGrid';
import BillingStatusBanner from '@/components/billing/BillingStatusBanner';
import MercadoPagoConnectionCard from '@/components/billing/MercadoPagoConnectionCard';
import MercadoPagoUpgradeCard from '@/components/billing/MercadoPagoUpgradeCard';
import {
  clearMercadoPagoConnectionAttempt,
  hasMercadoPagoConnectionAttempt,
} from '@/lib/billing/mercadoPagoConnectionAttempt';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import { useProfessionalMercadoPagoConnection } from '@/hooks/useProfessionalMercadoPagoConnection';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalBilling } from '@/hooks/useProfessionalBilling';

export default function ProfesionalBillingPage() {
  const router = useRouter();
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const plansRef = useRef<HTMLDivElement | null>(null);
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const canUseOnlinePayments = featureAccess.onlinePayments;

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
  } = useProfessionalMercadoPagoConnection(Boolean(profile?.id) && canUseOnlinePayments);

  const connectionCopy = getMercadoPagoConnectionStatusCopy(connection);
  const mercadoPagoBadge = canUseOnlinePayments ? connectionCopy.badge : 'Disponible desde PROFESIONAL';
  const mercadoPagoTitle = canUseOnlinePayments
    ? connectionCopy.title
    : 'Tu plan actual no habilita cobros online';

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  useEffect(() => {
    if (!router.isReady) return;
    if (!canUseOnlinePayments) {
      if (hasMercadoPagoConnectionAttempt()) {
        clearMercadoPagoConnectionAttempt();
      }
      return;
    }
    if (!hasMercadoPagoConnectionAttempt()) return;
    void router.replace('/oauth/mercadopago/callback');
  }, [canUseOnlinePayments, router, router.isReady]);

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleDisconnectMercadoPago = async () => {
    const confirmed = window.confirm(
      'Vas a desconectar tu cuenta de Mercado Pago para cobros de reservas. ¿Querés continuar?',
    );
    if (!confirmed) return;
    await disconnect();
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active="Facturación" />
          </div>
        </aside>

        <div className="flex-1">
          <div className="px-4 pt-4 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
              <ProfesionalSidebar profile={profile} active="Facturación" />
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="space-y-6">
              <DashboardHero
                eyebrow="Facturación"
                icon="plan"
                accent="ink"
                title="Gestioná tu plan de Plura y la cuenta con la que cobrás reservas"
                description="Acá separás claramente tu suscripción a Plura de la cuenta de Mercado Pago que usás para cobrar reservas online."
                meta={
                  <>
                    <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                      Plan {currentPlan.label}
                    </span>
                    <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                      Cobros: {mercadoPagoBadge}
                    </span>
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
                <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
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

                  <section className="space-y-4">
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
                      onCancel={() => {
                        void handleSelectPlan('BASIC');
                      }}
                      onBrowsePlans={scrollToPlans}
                      onVerifyStatus={() => {
                        void refreshSubscriptionStatus();
                      }}
                    />

                    <BillingFeatureComparison currentPlanId={currentPlanId} />

                    <section
                      id="billing-plans"
                      ref={plansRef}
                      className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                    >
                      <DashboardSectionHeading
                        title="Planes disponibles"
                        description="BASIC funciona como base gratuita. PROFESIONAL y ENTERPRISE abren checkout en Mercado Pago para la suscripción de Plura."
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
                          onSelectPlan={(planId) => {
                            void handleSelectPlan(planId);
                          }}
                        />
                      </div>
                    </section>
                  </section>

                  <section className="space-y-4">
                    <DashboardSectionHeading
                      title="Cobros de reservas con Mercado Pago"
                      description={canUseOnlinePayments
                        ? 'Esta sección representa la cuenta del profesional para cobrar reservas online. No cambia tu plan de Plura.'
                        : 'Esta sección queda disponible cuando tu plan habilita pagos online. No cambia tu suscripción a Plura.'}
                    />

                    {canUseOnlinePayments ? (
                      <MercadoPagoConnectionCard
                        connection={connection}
                        isLoading={isLoadingConnection}
                        isStartingOAuth={isStartingOAuth}
                        isDisconnecting={isDisconnecting}
                        onConnect={() => {
                          void startOAuth();
                        }}
                        onDisconnect={() => {
                          void handleDisconnectMercadoPago();
                        }}
                        onRefresh={() => {
                          void reloadConnection();
                        }}
                      />
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
          </main>
        </div>
      </div>
    </div>
  );
}
