import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';
import { DashboardIcon } from '@/components/profesional/dashboard/DashboardUI';
import type { BillingBannerState } from '@/hooks/useProfessionalBilling';

const toneClassNames = {
  info: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
  success: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
  warning: 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]',
  error: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  loading: 'border-[#CDEEE9] bg-[#F0FFFC] text-[#0F766E]',
};

const toneIcon = {
  info: 'spark',
  success: 'check',
  warning: 'warning',
  error: 'warning',
  loading: 'plan',
} as const;

export default function BillingStatusBanner({
  banner,
  onDismiss,
}: {
  banner: BillingBannerState;
  onDismiss?: () => void;
}) {
  return (
    <Card
      tone="glass"
      className={cn('rounded-[24px] border p-4', toneClassNames[banner.tone])}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-current/15 bg-white/70">
            <DashboardIcon name={toneIcon[banner.tone]} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{banner.title}</p>
            <p className="mt-1 text-sm text-current/85">{banner.description}</p>
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-current/15 bg-white/70 px-3 py-1 text-xs font-semibold transition hover:bg-white"
          >
            Cerrar
          </button>
        ) : null}
      </div>
    </Card>
  );
}
