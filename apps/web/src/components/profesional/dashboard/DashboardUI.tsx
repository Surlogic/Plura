import type { ReactNode, SVGProps } from 'react';
import Card from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

export type DashboardIconName =
  | 'agenda'
  | 'reservas'
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
  | 'danger';

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
};

export function DashboardIcon({ name, className, ...props }: IconProps) {
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
}

type DashboardHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: DashboardIconName;
  accent?: 'teal' | 'warm' | 'ink';
  actions?: ReactNode;
  meta?: ReactNode;
};

const heroToneClassNames = {
  teal:
    'bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_52%,var(--brand-navy-elevated)_100%)] text-[color:var(--text-on-dark)]',
  warm:
    'bg-[linear-gradient(145deg,var(--brand-navy)_0%,#2b2435_56%,#4a3524_100%)] text-[color:var(--text-on-dark)]',
  ink:
    'bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_58%,var(--brand-navy-elevated)_100%)] text-[color:var(--text-on-dark)]',
};

export function DashboardHero({
  eyebrow,
  title,
  description,
  icon,
  accent = 'teal',
  actions,
  meta,
}: DashboardHeroProps) {
  return (
    <Card
      tone="dark"
      className={cn(
        'relative isolate overflow-hidden border-white/12 p-6 shadow-[var(--shadow-lift)]',
        heroToneClassNames[accent],
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(15,23,42,0.16)_0%,rgba(15,23,42,0.3)_44%,rgba(15,23,42,0.5)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/16" />
        <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-[color:var(--brand-primary)]/8 blur-3xl" />
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[color:var(--accent)]/12 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col gap-5 opacity-100 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.32] bg-white/[0.04] px-3 py-2 backdrop-blur-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.24] bg-white/[0.04] text-[#F4F8FB]">
              <DashboardIcon name={icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#EAF2F7]">
              {eyebrow}
            </span>
          </div>
          <h1
            className="mt-4 max-w-2xl text-[2rem] font-semibold tracking-[-0.03em] !text-[#F4F8FB] opacity-100 sm:text-[2.15rem]"
            style={{ color: '#F4F8FB' }}
          >
            {title}
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm !text-[#D6E2EA] opacity-100 sm:text-[0.95rem]"
            style={{ color: '#D6E2EA' }}
          >
            {description}
          </p>
          {meta ? (
            <div className="mt-5 flex flex-wrap gap-2 text-[#EAF2F7] [&_span]:border-white/[0.32] [&_span]:bg-white/[0.04] [&_span]:!text-[#EAF2F7]">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="relative z-10 flex flex-wrap gap-3 [&_a]:border-white/[0.42] [&_a]:bg-white/[0.02] [&_a]:!text-[#F4F8FB] [&_a:hover]:bg-white/[0.06] [&_button]:border-white/[0.42] [&_button]:bg-white/[0.02] [&_button]:!text-[#F4F8FB] [&_button:hover]:bg-white/[0.06]">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

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

export function DashboardStatCard({
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
        'rounded-[22px] border p-4 shadow-[var(--shadow-card)]',
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
            'mt-3 text-[2rem] font-semibold tracking-[-0.04em]',
            tone === 'dark' ? 'text-[color:var(--text-on-dark)]' : 'text-[color:var(--ink)]',
          )}>
            {value}
          </p>
          {detail ? (
            <p className={cn(
              'mt-2 text-sm',
              tone === 'dark' ? 'text-[color:var(--text-on-dark-secondary)]' : 'text-[color:var(--ink-muted)]',
            )}>
              {detail}
            </p>
          ) : null}
        </div>
        <span className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
          tone === 'dark' ? 'border border-white/14 bg-white/10 text-[color:var(--text-on-dark)]' : 'border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--primary)]',
        )}>
          <DashboardIcon name={icon} />
        </span>
      </div>
    </div>
  );
}

type DashboardSectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function DashboardSectionHeading({
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
}
