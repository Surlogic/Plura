import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { BillingPlanDefinition } from '@/config/billingPlans';

type BillingPlanCardProps = {
  plan: BillingPlanDefinition;
  buttonLabel: string;
  isCurrent: boolean;
  isBusy: boolean;
  disabled: boolean;
  onSelect: () => void;
};

const accentClassNames = {
  default: 'border-[#E2E7EC] bg-white/95',
  accent: 'border-[#CDEEE9] bg-[#F7FBFA]',
  warm: 'border-[#F4D4B0] bg-[#FFF8F0]',
};

export default function BillingPlanCard({
  plan,
  buttonLabel,
  isCurrent,
  isBusy,
  disabled,
  onSelect,
}: BillingPlanCardProps) {
  return (
    <Card
      tone="glass"
      className={cn(
        'relative rounded-[28px] border p-5',
        accentClassNames[plan.accent],
        isCurrent ? 'ring-2 ring-[#1FB6A6]/20' : '',
      )}
    >
      {plan.recommended ? (
        <span className="absolute right-5 top-5 rounded-full border border-[#CDEEE9] bg-[#F0FFFC] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#0F766E]">
          Recomendado
        </span>
      ) : null}

      <div className="pr-24">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#94A3B8]">
          Plan
        </p>
        <h3 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#0E2A47]">
          {plan.label}
        </h3>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0E2A47]">
          {plan.priceLabel}
        </p>
        {plan.note ? (
          <p className="mt-1 text-sm text-[#64748B]">{plan.note}</p>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        {plan.benefits.map((benefit) => (
          <div key={benefit} className="flex items-start gap-2 text-sm text-[#475569]">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#1FB6A6]" />
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        variant={isCurrent ? 'secondary' : 'primary'}
        onClick={onSelect}
        disabled={disabled || isBusy}
        className="mt-6 w-full"
      >
        {isBusy ? 'Procesando...' : buttonLabel}
      </Button>
    </Card>
  );
}
