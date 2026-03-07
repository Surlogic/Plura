'use client';

import { useRef, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import BillingCurrentPlanCard from '@/components/billing/BillingCurrentPlanCard';
import BillingPlansGrid from '@/components/billing/BillingPlansGrid';
import BillingStatusBanner from '@/components/billing/BillingStatusBanner';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalBilling } from '@/hooks/useProfessionalBilling';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';

export default function ProfesionalBillingPage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const plansRef = useRef<HTMLDivElement | null>(null);

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

  useProfessionalDashboardUnsavedSection({
    sectionId: 'billing-dashboard',
    isDirty: false,
    isSaving: isCancelling || isRedirectingToCheckout,
  });

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
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
            <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
              <ProfesionalSidebar profile={profile} active="Facturación" />
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="space-y-6">
              <DashboardHero
                eyebrow="Facturacion"
                icon="plan"
                accent="ink"
                title="Plan, cobros y suscripcion en un flujo separado del resto de la cuenta"
                description="Consulta el plan vigente, cambia de nivel cuando lo necesites y sigue la activacion del pago sin salir del dashboard profesional."
                meta={
                  <>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                      Plan {currentPlan.label}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                      {enabledCapabilities.length} capacidades activas
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
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <DashboardStatCard
                      label="Plan actual"
                      value={currentPlan.label}
                      detail="Nivel vigente para el perfil profesional"
                      icon="plan"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Estado"
                      value={currentStatusLabel}
                      detail={subscription?.cancelAtPeriodEnd ? 'Cancelacion al fin del periodo' : 'Estado comercial de la suscripcion'}
                      icon={currentStatus === 'ACTIVE' || currentStatus === 'NONE' ? 'spark' : 'warning'}
                      tone={currentStatus === 'ACTIVE' || currentStatus === 'NONE' ? 'default' : 'warm'}
                    />
                    <DashboardStatCard
                      label="Renovacion"
                      value={renewalLabel}
                      detail="Fecha estimada del proximo hito"
                      icon="agenda"
                      tone="default"
                    />
                  </div>

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

                  <section
                    id="billing-plans"
                    ref={plansRef}
                    className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                  >
                    <DashboardSectionHeading
                      title="Planes disponibles"
                      description="BASIC funciona como base gratuita. PRO y PREMIUM abren checkout en Mercado Pago y la activacion final depende del webhook."
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
