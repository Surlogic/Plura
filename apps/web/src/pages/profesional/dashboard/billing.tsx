'use client';

import { useCallback, useRef } from 'react';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import BillingCurrentPlanCard from '@/components/billing/BillingCurrentPlanCard';
import BillingStatusBanner from '@/components/billing/BillingStatusBanner';
import MercadoPagoConnectionCard from '@/components/billing/MercadoPagoConnectionCard';
import Button from '@/components/ui/Button';
import { formatBillingDate } from '@/lib/billing/billing';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import { getMercadoPagoConnectionStatusCopy } from '@/lib/billing/professionalMercadoPagoConnection';
import { useProfessionalMercadoPagoConnection } from '@/hooks/useProfessionalMercadoPagoConnection';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalBilling } from '@/hooks/useProfessionalBilling';

export default function ProfesionalBillingPage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const planDetailsRef = useRef<HTMLDivElement | null>(null);
  const paymentsSectionRef = useRef<HTMLElement | null>(null);
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const canUseOnlinePayments = featureAccess.onlinePayments;
  const shouldLoadMercadoPagoConnection =
    Boolean(profile?.id)
    && canUseOnlinePayments
    && true;

  const {
    subscription,
    currentPlan,
    currentStatus,
    currentStatusLabel,
    currentStatusClassName,
    renewalLabel,
    currentAmountLabel,
    enabledCapabilities,
    banner,
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
  const mercadoPagoBadge = canUseOnlinePayments ? connectionCopy.badge : 'Proximamente';
  const mercadoPagoTitle = canUseOnlinePayments
    ? connectionCopy.title
    : 'Cobros online proximamente';

  const showSkeleton = !hasLoaded || (isLoading && !profile);
  const hasValidCoreAccess =
    currentStatus === 'ACTIVE'
    || currentStatus === 'TRIALING'
    || (currentStatus === 'TRIAL' && subscription?.trialActive === true)
    || subscription?.planEnabled === true;
  const showTrialDetails =
    currentStatus === 'TRIALING'
    || (currentStatus === 'TRIAL' && subscription?.trialActive === true);
  const showCheckoutPending = currentStatus === 'CHECKOUT_PENDING';
  const showExpired = currentStatus === 'EXPIRED';

  const handleDisconnectMercadoPago = useCallback(async () => {
    const confirmed = window.confirm(
      'Vas a desconectar tu cuenta de Mercado Pago para cobros de reservas. ¿Querés continuar?',
    );
    if (!confirmed) return;
    await disconnect();
  }, [disconnect]);

  const handleVerifyBillingStatus = useCallback(() => {
    void refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const handleStartMercadoPagoOAuth = useCallback(() => {
    void startOAuth();
  }, [startOAuth]);

  const handleActivateCore = useCallback(() => {
    void handleSelectPlan('CORE');
  }, [handleSelectPlan]);

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
                title="Suscripción y cobros"
                description="Gestioná el estado de tu suscripción y la conexión de cobros online."
                meta={
                  <>
                    <DashboardHeaderBadge tone="accent">
                      {currentPlan.label}
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
                      label="Suscripción actual"
                      value={currentPlan.label}
                      detail="Acceso mensual a Plura"
                      icon="plan"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Suscripción"
                      value={currentStatusLabel}
                      detail={subscription?.cancelAtPeriodEnd ? 'Cancelación al fin del período' : 'Estado de tu suscripción'}
                      icon={hasValidCoreAccess || currentStatus === 'NONE' ? 'spark' : 'warning'}
                      tone={hasValidCoreAccess || currentStatus === 'NONE' ? 'default' : 'warm'}
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
                      detail="Extras operativos disponibles"
                      icon="reservas"
                      tone="default"
                    />
                  </div>

                  <section ref={planDetailsRef} className="space-y-4">
                    <DashboardSectionHeading
                      title="Mi suscripción de Plura"
                      description="Tu suscripción mantiene activas las herramientas principales de operación."
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
                        false
                      }
                      isCancelling={isCancelling}
                      capabilities={enabledCapabilities.map((feature) => feature.label)}
                      showVerifyStatusButton={hasPendingCheckout || showCheckoutPending}
                      isVerifyingStatus={isRefreshingSubscriptionStatus}
                      onVerifyStatus={handleVerifyBillingStatus}
                    />

                    {showTrialDetails ? (
                      <div className="rounded-[18px] border border-[#BFDBFE] bg-[#EFF6FF] p-5 text-sm text-[#1D4ED8]">
                        <p className="font-semibold">Prueba gratuita activa</p>
                        <p className="mt-2">Finaliza: {formatBillingDate(subscription?.trialEndAt)}</p>
                        <p className="mt-1">Dias restantes: {subscription?.trialDaysRemaining ?? 'No disponible'}</p>
                        <p className="mt-1">Luego: suscripción mensual de Plura.</p>
                        {subscription?.paymentMethodAttached === false ? (
                          <p className="mt-3 rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[#B45309]">
                            Falta autorizar el medio de pago para mantener la suscripción al finalizar la prueba.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {showCheckoutPending ? (
                      <div className="rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] p-5 text-sm text-[#92400E]">
                        <p className="font-semibold">Activacion pendiente</p>
                        <p className="mt-2">Termina la autorizacion en Mercado Pago para activar la prueba.</p>
                        <p className="mt-2">Si ya completaste Mercado Pago, verificá el estado. El webhook puede tardar unos minutos.</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleVerifyBillingStatus}
                            disabled={isRefreshingSubscriptionStatus}
                          >
                            {isRefreshingSubscriptionStatus ? 'Verificando...' : 'Verificar estado'}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {showExpired ? (
                      <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]">
                        <p className="font-semibold">Prueba vencida</p>
                        <p className="mt-2">Activá la suscripción para mantener el acceso mensual.</p>
                        <Button
                          type="button"
                          variant="primary"
                          className="mt-4"
                          onClick={handleActivateCore}
                          disabled={isRedirectingToCheckout}
                        >
                          {isRedirectingToCheckout ? 'Redirigiendo a Mercado Pago...' : 'Activar suscripción'}
                        </Button>
                      </div>
                    ) : null}
                  </section>

                  <section ref={paymentsSectionRef} className="space-y-4">
                    <DashboardSectionHeading
                      title="Cobros de reservas con Mercado Pago"
                      description={canUseOnlinePayments
                        ? 'Conectá la cuenta del profesional para cobrar reservas online. Esto no cambia tu suscripción.'
                        : 'Cobros online todavía no está disponible para esta cuenta.'}
                    />

                    {canUseOnlinePayments ? (
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
                      <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 text-sm text-[#64748B] shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                        Cobros online proximamente.
                      </div>
                    )}
                  </section>
                </div>
              )}
      </div>
    </ProfessionalDashboardShell>
  );
}
