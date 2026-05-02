import { memo, type ReactNode, type SVGProps } from 'react';
import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

export type DashboardIconName =
  | 'agenda'
  | 'reservas'
  | 'notificaciones'
  | 'horarios'
  | 'servicios'
  | 'negocio'
  | 'publica'
  | 'configuracion'
  | 'analytics'
  | 'check'
  | 'warning'
  | 'spark'
  | 'share'
  | 'plan'
  | 'danger'
  | 'resenas';

type IconProps = SVGProps<SVGSVGElement> & {
  name: DashboardIconName;
};

const iconPathByName: Record<DashboardIconName, ReactNode> = {
  agenda: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  reservas: (
    <>
      <path d="M8 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M16 11a3 3 0 1 0 0-6" />
      <path d="M3.5 19c1.2-2.4 3.4-4 6.5-4s5.3 1.6 6.5 4" />
      <path d="M15.5 15c2 0 3.8 1.1 5 3" />
    </>
  ),
  notificaciones: (
    <>
      <path d="M6.5 16.5h11" />
      <path d="M8 16.5V10a4 4 0 1 1 8 0v6.5" />
      <path d="M5 16.5h14" />
      <path d="M10 19a2.25 2.25 0 0 0 4 0" />
    </>
  ),
  horarios: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3.5 2" />
    </>
  ),
  servicios: (
    <>
      <path d="M6 4v7M10 4v7M6 8h4M7.5 11 6 20M8.5 11 10 20" />
      <path d="M15 4c0 3 0 5.5 3 7v3c0 1.5-.5 3-1.4 4.2L15 20" />
    </>
  ),
  negocio: (
    <>
      <path d="M4 10 5.5 5h13L20 10" />
      <path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
      <path d="M9 20v-5h6v5" />
    </>
  ),
  publica: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.2 3.8 5.2 3.8 8.5s-1.4 6.3-3.8 8.5c-2.4-2.2-3.8-5.2-3.8-8.5S9.6 5.7 12 3.5Z" />
    </>
  ),
  configuracion: (
    <>
      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
      <path d="M19 12a7 7 0 0 0-.08-1l2.03-1.58-2-3.46-2.44.8a7.4 7.4 0 0 0-1.72-1L14.4 3h-4.8l-.39 2.76c-.61.24-1.19.57-1.72 1l-2.44-.8-2 3.46L5.08 11A7 7 0 0 0 5 12c0 .34.03.67.08 1L3.05 14.58l2 3.46 2.44-.8c.53.43 1.11.76 1.72 1L9.6 21h4.8l.39-2.76c.61-.24 1.19-.57 1.72-1l2.44.8 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
    </>
  ),
  analytics: (
    <>
      <path d="M5 19V9M12 19V5M19 19v-8" />
      <path d="M3 19h18" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4 10-10" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="m8 11 8-4M8 13l8 4" />
    </>
  ),
  plan: (
    <>
      <path d="M4 7.5h16v9H4z" />
      <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M4 12h16" />
    </>
  ),
  danger: (
    <>
      <path d="M8 4h8" />
      <path d="M6 7h12" />
      <path d="m9 7 .5 12h5L15 7" />
    </>
  ),
  resenas: (
    <>
      <path d="m12 3 2.5 5.1L20 9l-4 3.9.9 5.6L12 15.8l-4.9 2.7.9-5.6L4 9l5.5-.9L12 3Z" />
    </>
  ),
};

export const DashboardIcon = memo(function DashboardIcon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-5 w-5', className)}
      {...props}
    >
      {iconPathByName[name]}
    </svg>
  );
});

type DashboardHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: DashboardIconName;
  accent?: 'teal' | 'warm' | 'ink';
  size?: 'default' | 'compact';
  actions?: ReactNode;
  meta?: ReactNode;
};

const heroToneClassNames = {
  teal: {
    shell: 'border-[#D9ECE8] bg-[linear-gradient(180deg,rgba(31,182,166,0.05)_0%,rgba(255,255,255,0.98)_34%,#FFFFFF_100%)]',
    icon: 'border-[#BFEDE7] bg-[#ECFDF5] text-[#0F766E]',
    eyebrow: 'text-[#0F766E]',
  },
  warm: {
    shell: 'border-[#F4E1C7] bg-[linear-gradient(180deg,rgba(245,158,11,0.06)_0%,rgba(255,255,255,0.98)_34%,#FFFFFF_100%)]',
    icon: 'border-[#F6D6A8] bg-[#FFF7E8] text-[#B45309]',
    eyebrow: 'text-[#B45309]',
  },
  ink: {
    shell: 'border-[#D9E2EC] bg-[linear-gradient(180deg,rgba(14,42,71,0.04)_0%,rgba(255,255,255,0.98)_34%,#FFFFFF_100%)]',
    icon: 'border-[#D7E0E8] bg-[#F4F7FB] text-[#0E2A47]',
    eyebrow: 'text-[#0E2A47]',
  },
};

export const DashboardHero = memo(function DashboardHero({
  eyebrow,
  title,
  description,
  icon,
  accent = 'teal',
  size = 'default',
  actions,
  meta,
}: DashboardHeroProps) {
  const toneStyles = heroToneClassNames[accent];

  return (
    <Card
      className={cn(
        'relative isolate overflow-hidden border shadow-[0_16px_40px_rgba(15,23,42,0.08)]',
        size === 'compact' ? 'p-4 sm:p-5' : 'p-5 sm:p-6',
        toneStyles.shell,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.42)_100%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute left-6 top-0 h-px w-[calc(100%-3rem)] bg-white/90" />
      <div
        className={cn(
          'relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
          size === 'compact' ? 'lg:gap-5' : 'lg:gap-6',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-[14px] border shadow-[0_10px_24px_rgba(15,23,42,0.06)]',
                size === 'compact' ? 'h-10 w-10' : 'h-11 w-11',
                toneStyles.icon,
              )}
            >
              <DashboardIcon name={icon} className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[0.65rem] font-semibold uppercase tracking-[0.22em]',
                  toneStyles.eyebrow,
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cn(
                  'mt-1 font-semibold tracking-[-0.03em] text-[color:var(--ink)]',
                  size === 'compact' ? 'text-[1.35rem] sm:text-[1.55rem]' : 'text-[1.55rem] sm:text-[1.8rem]',
                )}
              >
                {title}
              </h1>
            </div>
          </div>
          <p
            className={cn(
              'max-w-3xl text-[color:var(--ink-muted)]',
              size === 'compact' ? 'mt-3 text-sm' : 'mt-4 text-[0.95rem]',
            )}
          >
            {description}
          </p>
          {meta ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="relative z-10 flex shrink-0 flex-wrap gap-2.5 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
});

type DashboardHeaderBadgeProps = {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning';
};

const badgeToneClassNames = {
  default: 'border-[#D9E2EC] bg-[#F8FAFC] text-[#475569]',
  accent: 'border-[#DBEAFE] bg-[#F8FBFF] text-[#1D4ED8]',
  success: 'border-[#BFEDE7] bg-[#F0FDFA] text-[#0F766E]',
  warning: 'border-[#F6D6A8] bg-[#FFF7E8] text-[#B45309]',
};

export const DashboardHeaderBadge = memo(function DashboardHeaderBadge({
  children,
  tone = 'default',
}: DashboardHeaderBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold',
        badgeToneClassNames[tone],
      )}
    >
      {children}
    </span>
  );
});

type DashboardStatCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: DashboardIconName;
  tone?: 'default' | 'accent' | 'warm' | 'dark';
  className?: string;
};

const statToneClassNames = {
  default:
    'border-[color:var(--border-soft)] bg-white/96 text-[color:var(--ink)]',
  accent:
    'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)]',
  warm:
    'border-[color:var(--premium-soft)] bg-[rgba(200,138,243,0.08)] text-[color:var(--ink)]',
  dark:
    'border-white/12 bg-[linear-gradient(160deg,var(--brand-navy)_0%,var(--brand-navy-soft)_54%,var(--brand-navy-elevated)_100%)] text-[color:var(--text-on-dark)]',
};

export const DashboardStatCard = memo(function DashboardStatCard({
  label,
  value,
  detail,
  icon,
  tone = 'default',
  className,
}: DashboardStatCardProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]',
        statToneClassNames[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn(
          'text-[0.68rem] font-semibold uppercase tracking-[0.28em]',
          tone === 'dark' ? 'text-[color:var(--text-on-dark-secondary)]' : 'text-[color:var(--ink-muted)]',
          )}>
            {label}
          </p>
          <p className={cn(
            'mt-2.5 text-[1.6rem] font-semibold tracking-[-0.04em] sm:text-[1.8rem]',
            tone === 'dark' ? 'text-[color:var(--text-on-dark)]' : 'text-[color:var(--ink)]',
          )}>
            {value}
          </p>
          {detail ? (
            <p className={cn(
              'mt-1.5 text-xs sm:text-[0.82rem]',
              tone === 'dark' ? 'text-[color:var(--text-on-dark-secondary)]' : 'text-[color:var(--ink-muted)]',
            )}>
              {detail}
            </p>
          ) : null}
        </div>
        <span className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-[14px]',
          tone === 'dark' ? 'border border-white/14 bg-white/10 text-[color:var(--text-on-dark)]' : 'border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--primary)]',
        )}>
          <DashboardIcon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
    </div>
  );
});

type DashboardSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const DashboardSectionHeading = memo(function DashboardSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: DashboardSectionHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        {eyebrow ? (
          <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
});
