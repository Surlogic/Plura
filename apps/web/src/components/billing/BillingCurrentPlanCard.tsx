import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { BillingPlanDefinition } from '@/config/billingPlans';

type BillingCurrentPlanCardProps = {
  plan: BillingPlanDefinition;
  amountLabel: string;
  statusLabel: string;
  statusClassName: string;
  renewalLabel: string;
  providerLabel: string;
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  isCancelling: boolean;
  showVerifyStatusButton: boolean;
  isVerifyingStatus: boolean;
  capabilities: string[];
  onCancel: () => void;
  onBrowsePlans: () => void;
  onVerifyStatus: () => void;
};

export default function BillingCurrentPlanCard({
  plan,
  amountLabel,
  statusLabel,
  statusClassName,
  renewalLabel,
  providerLabel,
  cancelAtPeriodEnd,
  canCancel,
  isCancelling,
  showVerifyStatusButton,
  isVerifyingStatus,
  capabilities,
  onCancel,
  onBrowsePlans,
  onVerifyStatus,
}: BillingCurrentPlanCardProps) {
  return (
    <Card tone="glass" className="rounded-[28px] border-white/75 p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#CDEEE9] bg-[#F0FFFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0F766E]">
              Plan actual
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>
              {statusLabel}
            </span>
            {cancelAtPeriodEnd ? (
              <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#B45309]">
                Cancelacion programada
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
              {plan.label}
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Gestiona tu nivel actual, la proxima renovacion y el cambio de plan sin salir del dashboard.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Monto</p>
              <p className="mt-2 text-lg font-semibold text-[#0E2A47]">{amountLabel}</p>
            </div>
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Renovacion</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">{renewalLabel}</p>
            </div>
            <div className="rounded-[20px] border border-[#E2E7EC] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Proveedor</p>
              <p className="mt-2 text-sm font-semibold text-[#0E2A47]">{providerLabel}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
              Beneficios activos
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {capabilities.length > 0 ? (
                capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full border border-[#D8EBE7] bg-[#F7FBFA] px-3 py-1 text-xs font-semibold text-[#0E2A47]"
                  >
                    {capability}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#64748B]">
                  Este plan no habilita capacidades extra dentro del dashboard.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            type="button"
            size="lg"
            variant="primary"
            onClick={onBrowsePlans}
          >
            Cambiar plan
          </Button>
          {showVerifyStatusButton ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={onVerifyStatus}
              disabled={isVerifyingStatus}
            >
              {isVerifyingStatus ? 'Verificando...' : 'Verificar estado del pago'}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              size="lg"
              onClick={onCancel}
              disabled={isCancelling}
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              {isCancelling ? 'Procesando...' : 'Cancelar suscripcion'}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
