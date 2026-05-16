import { memo } from 'react';
import Card from '@/components/ui/Card';
import type { BillingUiPlanId } from '@/config/billingPlans';
import { billingPlanById } from '@/config/billingPlans';

type BillingFeatureComparisonProps = {
  currentPlanId: BillingUiPlanId;
};

const coreCapabilities = [
  {
    label: 'Perfil público mejorado',
    detail: 'Logo, redes, headline y texto de presentación incluidos en Core.',
  },
  {
    label: 'Pagos online en servicios',
    detail: 'Seña online o prepago completo con Mercado Pago dentro del flujo Core.',
  },
  {
    label: 'Agenda navegable',
    detail: 'Movimiento por semanas futuras y pasadas desde el dashboard.',
  },
  {
    label: 'Vista mensual',
    detail: 'Calendario mensual disponible dentro del dashboard profesional/local.',
  },
  {
    label: 'Fotos del negocio',
    detail: 'Hasta 6 fotos para la página pública del negocio.',
  },
  {
    label: 'Analytics',
    detail: 'No incluido en Core; queda como extra futuro.',
    comingSoon: true,
  },
];

function BillingFeatureComparison({
  currentPlanId,
}: BillingFeatureComparisonProps) {
  const currentPlan = billingPlanById[currentPlanId] ?? billingPlanById.CORE;

  return (
    <Card tone="glass" className="rounded-[28px] border-white/75 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#94A3B8]">
            Core
          </p>
          <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
            Capacidades incluidas en {currentPlan.label}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[#64748B]">
            Plura Core concentra la operación inicial del MVP. No hay comparativa de planes ni upgrades visibles.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[#CDEEE9] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
          Plan actual
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {coreCapabilities.map((capability) => (
          <div
            key={capability.label}
            className="rounded-[20px] border border-[#E2E8F0] bg-white/90 px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <span className={
                capability.comingSoon
                  ? 'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]'
                  : 'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#BFE7DB] bg-[#ECFDF5] text-[#047857]'
              }>
                {capability.comingSoon ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0E2A47]">
                  {capability.label}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {capability.detail}
                </p>
                {capability.comingSoon ? (
                  <span className="mt-3 inline-flex rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Extra futuro
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default memo(BillingFeatureComparison);
