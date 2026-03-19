import { Fragment } from 'react';
import Card from '@/components/ui/Card';
import type { BillingUiPlanId } from '@/config/billingPlans';
import { billingPlanById } from '@/config/billingPlans';
import { planIncludesProfessionalFeature } from '@/lib/billing/featureGuards';
import { cn } from '@/components/ui/cn';

type BillingFeatureComparisonProps = {
  currentPlanId: BillingUiPlanId;
};

const planColumnOrder: BillingUiPlanId[] = ['BASIC', 'PROFESIONAL', 'ENTERPRISE'];

const comparisonRows = [
  {
    label: 'Perfil publico mejorado',
    detail: 'Logo, redes, headline y texto de presentacion.',
    values: {
      BASIC: false,
      PROFESIONAL: true,
      ENTERPRISE: true,
    } as Record<BillingUiPlanId, boolean>,
  },
  {
    label: 'Pagos online en servicios',
    detail: 'Seña online o prepago completo.',
    values: {
      BASIC: planIncludesProfessionalFeature('BASIC', 'onlinePayments'),
      PROFESIONAL: planIncludesProfessionalFeature('PROFESIONAL', 'onlinePayments'),
      ENTERPRISE: planIncludesProfessionalFeature('ENTERPRISE', 'onlinePayments'),
    } as Record<BillingUiPlanId, boolean>,
  },
  {
    label: 'Agenda navegable',
    detail: 'Moverte por semanas futuras y pasadas.',
    values: {
      BASIC: planIncludesProfessionalFeature('BASIC', 'weeklyCalendarNavigation'),
      PROFESIONAL: planIncludesProfessionalFeature('PROFESIONAL', 'weeklyCalendarNavigation'),
      ENTERPRISE: planIncludesProfessionalFeature('ENTERPRISE', 'weeklyCalendarNavigation'),
    } as Record<BillingUiPlanId, boolean>,
  },
  {
    label: 'Vista mensual',
    detail: 'Calendario mensual dentro del dashboard.',
    values: {
      BASIC: planIncludesProfessionalFeature('BASIC', 'monthlyCalendar'),
      PROFESIONAL: planIncludesProfessionalFeature('PROFESIONAL', 'monthlyCalendar'),
      ENTERPRISE: planIncludesProfessionalFeature('ENTERPRISE', 'monthlyCalendar'),
    } as Record<BillingUiPlanId, boolean>,
  },
  {
    label: 'Analytics',
    detail: 'Lectura operativa y tendencia del negocio.',
    values: {
      BASIC: 'Sin analytics',
      PROFESIONAL: 'Basicos',
      ENTERPRISE: 'Avanzados',
    } as Record<BillingUiPlanId, string>,
  },
  {
    label: 'Fotos del negocio',
    detail: 'Limite cargable en la pagina publica.',
    values: {
      BASIC: 'Hasta 5',
      PROFESIONAL: 'Hasta 15',
      ENTERPRISE: 'Hasta 30',
    } as Record<BillingUiPlanId, string>,
  },
];

const renderValue = (value: boolean | string) => {
  if (typeof value === 'string') {
    return <span className="text-sm font-semibold text-[#0E2A47]">{value}</span>;
  }

  return value ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#BFE7DB] bg-[#ECFDF5] text-[#047857]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </span>
  );
};

export default function BillingFeatureComparison({
  currentPlanId,
}: BillingFeatureComparisonProps) {
  return (
    <Card tone="glass" className="rounded-[28px] border-white/75 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#94A3B8]">
            Comparativa
          </p>
          <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
            Qué desbloquea cada plan
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[#64748B]">
            La tabla refleja las capacidades que ya están conectadas en el dashboard web actual.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.45fr_repeat(3,0.85fr)] gap-3">
            <div className="rounded-[18px] border border-transparent px-4 py-3" />
            {planColumnOrder.map((planId) => {
              const plan = billingPlanById[planId];
              const isCurrent = currentPlanId === planId;
              return (
                <div
                  key={planId}
                  className={cn(
                    'rounded-[18px] border px-4 py-3 text-center',
                    isCurrent
                      ? 'border-[#CDEEE9] bg-[#F0FFFC]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]',
                  )}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                    Plan
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                    {plan.label}
                  </p>
                  {isCurrent ? (
                    <span className="mt-2 inline-flex rounded-full border border-[#CDEEE9] bg-white px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#0F766E]">
                      Actual
                    </span>
                  ) : null}
                </div>
              );
            })}

            {comparisonRows.map((row) => (
              <Fragment key={row.label}>
                <div
                  key={`${row.label}-label`}
                  className="rounded-[20px] border border-[#E2E8F0] bg-white/90 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-[#0E2A47]">{row.label}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{row.detail}</p>
                </div>
                {planColumnOrder.map((planId) => {
                  const isCurrent = currentPlanId === planId;
                  return (
                    <div
                      key={`${row.label}-${planId}`}
                      className={cn(
                        'flex items-center justify-center rounded-[20px] border px-4 py-4',
                        isCurrent
                          ? 'border-[#CDEEE9] bg-[#F7FFFB]'
                          : 'border-[#E2E8F0] bg-[#FBFCFD]',
                      )}
                    >
                      {renderValue(row.values[planId])}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
