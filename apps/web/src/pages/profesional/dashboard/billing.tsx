'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
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
import {
  getProfessionalPayoutConfig,
  updateProfessionalPayoutConfig,
} from '@/services/professionalPayout';
import type {
  ProfessionalPayoutConfig,
  ProfessionalPayoutConfigUpdateInput,
} from '@/types/payout';
import { formatPayoutFieldList, getPayoutStatusCopy } from '@/utils/payouts';

const emptyPayoutForm: ProfessionalPayoutConfigUpdateInput = {
  firstName: '',
  lastName: '',
  country: '',
  documentType: '',
  documentNumber: '',
  phone: '',
  bank: '',
  accountNumber: '',
  accountType: '',
  branch: '',
};

const fieldClassName =
  'mt-2 h-11 w-full rounded-[14px] border border-[#D7DEE7] bg-white px-3 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6] focus:ring-2 focus:ring-[#1FB6A6]/20 disabled:bg-[#F8FAFC] disabled:text-[#64748B]';

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

const buildPayoutForm = (
  config?: ProfessionalPayoutConfig | null,
): ProfessionalPayoutConfigUpdateInput => ({
  firstName: config?.firstName || '',
  lastName: config?.lastName || '',
  country: config?.country || '',
  documentType: config?.documentType || '',
  documentNumber: config?.documentNumber || '',
  phone: config?.phone || '',
  bank: config?.bank || '',
  accountNumber: config?.accountNumber || '',
  accountType: config?.accountType || '',
  branch: config?.branch || '',
});

export default function ProfesionalBillingPage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [payoutConfig, setPayoutConfig] = useState<ProfessionalPayoutConfig | null>(null);
  const [payoutForm, setPayoutForm] = useState<ProfessionalPayoutConfigUpdateInput>(emptyPayoutForm);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [isPayoutError, setIsPayoutError] = useState(false);
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

  const loadPayoutConfig = async () => {
    if (!profile?.id) return;

    try {
      setIsLoadingPayout(true);
      setIsPayoutError(false);
      const response = await getProfessionalPayoutConfig();
      setPayoutConfig(response);
      setPayoutForm(buildPayoutForm(response));
    } catch (error) {
      setPayoutConfig(null);
      setPayoutMessage(resolveBackendMessage(error, 'No se pudo cargar la configuración de cobro.'));
      setIsPayoutError(true);
    } finally {
      setIsLoadingPayout(false);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;
    void loadPayoutConfig();
  }, [profile?.id]);

  const initialPayoutSnapshot = useMemo(
    () => JSON.stringify(buildPayoutForm(payoutConfig)),
    [payoutConfig],
  );
  const currentPayoutSnapshot = useMemo(
    () => JSON.stringify(payoutForm),
    [payoutForm],
  );
  const isPayoutDirty = initialPayoutSnapshot !== currentPayoutSnapshot;

  const savePayoutConfig = async () => {
    try {
      setIsSavingPayout(true);
      setPayoutMessage(null);
      setIsPayoutError(false);
      const response = await updateProfessionalPayoutConfig(payoutForm);
      setPayoutConfig(response);
      setPayoutForm(buildPayoutForm(response));
      setPayoutMessage('Datos de cobro actualizados.');
      await refreshProfile();
      return true;
    } catch (error) {
      setPayoutMessage(resolveBackendMessage(error, 'No se pudieron guardar los datos de cobro.'));
      setIsPayoutError(true);
      return false;
    } finally {
      setIsSavingPayout(false);
    }
  };

  const resetPayoutForm = async () => {
    setPayoutForm(buildPayoutForm(payoutConfig));
    setPayoutMessage(null);
    setIsPayoutError(false);
  };

  useProfessionalDashboardUnsavedSection({
    sectionId: 'billing-dashboard',
    isDirty: isPayoutDirty,
    isSaving: isCancelling || isRedirectingToCheckout || isSavingPayout,
    onSave: savePayoutConfig,
    onReset: resetPayoutForm,
  });

  const showSkeleton = !hasLoaded || (isLoading && !profile);
  const payoutStatusCopy = useMemo(
    () => getPayoutStatusCopy(payoutConfig),
    [payoutConfig],
  );
  const payoutStatusBadgeClassName = payoutStatusCopy.tone === 'ready'
    ? 'border-[#BFE7DB] bg-[#ECFDF5] text-[#047857]'
    : payoutStatusCopy.tone === 'error'
      ? 'border-[#F8C7C7] bg-[#FEF2F2] text-[#B91C1C]'
      : 'border-[#F2D6A8] bg-[#FFF7E8] text-[#B45309]';
  const payoutSummaryCardClassName = payoutStatusCopy.tone === 'ready'
    ? 'border-[#D8F0E5] bg-[#F7FFFB]'
    : payoutStatusCopy.tone === 'error'
      ? 'border-[#F8D7DA] bg-[#FFF7F7]'
      : 'border-[#F3E1BC] bg-[#FFF9EF]';
  const payoutMissingCount = (payoutConfig?.missingFields || []).length + (payoutConfig?.invalidFields || []).length;
  const branchRequired = payoutConfig?.requiredFields?.includes('branch') ?? true;
  const canSavePayout = Boolean(payoutConfig)
    && !isSavingPayout
    && (isPayoutDirty || payoutConfig?.status !== 'READY');

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
                title="Plan y cobros listos para operar sin salir del dashboard"
                description="Desde acá podés dejar tu cuenta lista para cobrar en el piloto y seguir el estado comercial de tu suscripción."
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
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      label="Cobros"
                      value={payoutStatusCopy.badge}
                      detail={payoutStatusCopy.title}
                      icon={payoutConfig?.status === 'READY' ? 'check' : payoutConfig?.status === 'ERROR' ? 'warning' : 'plan'}
                      tone={payoutConfig?.status === 'READY' ? 'accent' : payoutConfig?.status === 'ERROR' ? 'warm' : 'default'}
                    />
                    <DashboardStatCard
                      label="Reservas pagas"
                      value={String(payoutConfig?.outstandingPaidBookingsCount || 0)}
                      detail="Con fondos retenidos o payout pendiente"
                      icon="reservas"
                      tone={payoutConfig?.outstandingPaidBookingsCount ? 'warm' : 'default'}
                    />
                  </div>

                  <section
                    id="payout-settings"
                    className="rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                  >
                    <DashboardSectionHeading
                      title="Cobros del profesional"
                      description="Cargá solo los datos mínimos para quedar listo para recibir payouts reales en el piloto."
                      action={isLoadingPayout ? (
                        <span className="text-xs font-semibold text-[#94A3B8]">
                          Cargando...
                        </span>
                      ) : null}
                    />

                    {payoutMessage ? (
                      <div
                        className={`mt-5 rounded-[18px] border px-4 py-3 text-sm font-medium ${
                          isPayoutError
                            ? 'border-[#F8C7C7] bg-[#FEF2F2] text-[#B91C1C]'
                            : 'border-[#CDE9E1] bg-[#F2FBF8] text-[#0F766E]'
                        }`}
                      >
                        {payoutMessage}
                      </div>
                    ) : null}

                    {isLoadingPayout && !payoutConfig ? (
                      <div className="mt-5 space-y-3">
                        <div className="h-24 rounded-[20px] bg-[#F1F5F9]" />
                        <div className="h-48 rounded-[20px] bg-[#F8FAFC]" />
                      </div>
                    ) : payoutConfig ? (
                      <>
                        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                          <Card className={payoutSummaryCardClassName}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${payoutStatusBadgeClassName}`}>
                                  {payoutStatusCopy.badge}
                                </span>
                                <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#0E2A47]">
                                  {payoutStatusCopy.title}
                                </h3>
                                <p className="mt-2 text-sm text-[#516072]">
                                  {payoutStatusCopy.description}
                                </p>
                              </div>
                              <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-3 text-right">
                                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#64748B]">
                                  Pendientes
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                                  {payoutConfig.outstandingPaidBookingsCount}
                                </p>
                                <p className="mt-1 text-xs text-[#64748B]">
                                  reservas pagas con release pendiente
                                </p>
                              </div>
                            </div>

                            {payoutConfig.hasOutstandingPaidBookings && !payoutConfig.readyToReceivePayouts ? (
                              <div className="mt-5 rounded-[18px] border border-[#F3D7AC] bg-[#FFF7E8] px-4 py-3 text-sm text-[#9A6700]">
                                El payout no podrá ejecutarse hasta completar esta configuración.
                              </div>
                            ) : null}

                            {(payoutConfig.missingFields?.length || payoutConfig.invalidFields?.length) ? (
                              <div className="mt-5 grid gap-3 md:grid-cols-2">
                                {payoutConfig.missingFields?.length ? (
                                  <div className="rounded-[18px] border border-[#E6ECF2] bg-white px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                                      Falta completar
                                    </p>
                                    <p className="mt-2 text-sm text-[#0E2A47]">
                                      {formatPayoutFieldList(payoutConfig.missingFields).join(', ')}
                                    </p>
                                  </div>
                                ) : null}
                                {payoutConfig.invalidFields?.length ? (
                                  <div className="rounded-[18px] border border-[#F4D0D0] bg-white px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B91C1C]">
                                      Revisar formato
                                    </p>
                                    <p className="mt-2 text-sm text-[#7F1D1D]">
                                      {formatPayoutFieldList(payoutConfig.invalidFields).join(', ')}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </Card>

                          <Card className="border-[#E6ECF2] bg-[#FAFCFE]">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#64748B]">
                              Datos base usados para cobrar
                            </p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                                  Email de la cuenta
                                </p>
                                <p className="mt-2 text-sm text-[#0E2A47]">
                                  {payoutConfig.email || 'Sin definir'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                                  Teléfono
                                </p>
                                <p className="mt-2 text-sm text-[#0E2A47]">
                                  {payoutConfig.phone || 'Sin definir'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                                  País
                                </p>
                                <p className="mt-2 text-sm text-[#0E2A47]">
                                  {payoutConfig.country || 'Sin definir'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                                  Faltantes
                                </p>
                                <p className="mt-2 text-sm text-[#0E2A47]">
                                  {payoutMissingCount}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Nombre
                            <input
                              className={fieldClassName}
                              value={payoutForm.firstName}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                firstName: event.target.value,
                              }))}
                              placeholder="Ej. Ana"
                              maxLength={120}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Apellido
                            <input
                              className={fieldClassName}
                              value={payoutForm.lastName}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                lastName: event.target.value,
                              }))}
                              placeholder="Ej. Pérez"
                              maxLength={120}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            País
                            <input
                              className={fieldClassName}
                              value={payoutForm.country}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                country: event.target.value.toUpperCase().slice(0, 2),
                              }))}
                              placeholder="UY"
                              maxLength={2}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Tipo de documento
                            <input
                              className={fieldClassName}
                              value={payoutForm.documentType}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                documentType: event.target.value,
                              }))}
                              placeholder="CI, DNI, PASSPORT"
                              maxLength={30}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Número de documento
                            <input
                              className={fieldClassName}
                              value={payoutForm.documentNumber}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                documentNumber: event.target.value,
                              }))}
                              placeholder="Documento del titular"
                              maxLength={64}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Email
                            <input
                              className={fieldClassName}
                              value={payoutConfig.email || ''}
                              disabled
                              readOnly
                            />
                            <span className="mt-2 block text-xs text-[#64748B]">
                              Se usa el email actual de tu cuenta profesional.
                            </span>
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Teléfono
                            <input
                              className={fieldClassName}
                              value={payoutForm.phone}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                phone: event.target.value,
                              }))}
                              placeholder="+598 ..."
                              maxLength={30}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Banco
                            <input
                              className={fieldClassName}
                              value={payoutForm.bank}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                bank: event.target.value,
                              }))}
                              placeholder="Ej. BROU"
                              maxLength={20}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Número de cuenta
                            <input
                              className={fieldClassName}
                              value={payoutForm.accountNumber}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                accountNumber: event.target.value,
                              }))}
                              placeholder="Cuenta bancaria"
                              maxLength={64}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Tipo de cuenta
                            <input
                              className={fieldClassName}
                              value={payoutForm.accountType}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                accountType: event.target.value,
                              }))}
                              placeholder="Caja de ahorro, corriente, etc."
                              maxLength={20}
                            />
                          </label>

                          <label className="block text-sm font-medium text-[#0E2A47]">
                            Sucursal
                            {!branchRequired ? (
                              <span className="ml-2 text-xs font-semibold text-[#64748B]">
                                Opcional para este país
                              </span>
                            ) : null}
                            <input
                              className={fieldClassName}
                              value={payoutForm.branch}
                              onChange={(event) => setPayoutForm((current) => ({
                                ...current,
                                branch: event.target.value,
                              }))}
                              placeholder="Sucursal bancaria"
                              maxLength={20}
                            />
                          </label>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-[#E6ECF2] pt-5 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm text-[#64748B]">
                            Guardá estos datos para habilitar tus cobros. No mostramos conceptos técnicos del provider ni payloads internos.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                void resetPayoutForm();
                              }}
                              disabled={!isPayoutDirty || isSavingPayout}
                            >
                              Descartar cambios
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                void savePayoutConfig();
                              }}
                              disabled={!canSavePayout}
                            >
                              {isSavingPayout ? 'Guardando...' : 'Guardar datos de cobro'}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </section>

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
