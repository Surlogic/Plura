import Link from 'next/link';
import Image from 'next/image';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { ProfessionalProfile } from '@/types/professional';
import type { ProfessionalPlanCode } from '../../../../../packages/shared/src/types/professional';
import { hasPlanAccess, PLAN_LABELS } from '../../../../../packages/shared/src/billing/planAccess';
import {
  canAccessProfessionalFeature,
  requiredPlanForFeature,
  type ProfessionalFeatureKey,
} from '@/lib/billing/featureGuards';
import { useProfessionalDashboardUnsavedChanges } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import Badge from '@/components/ui/Badge';
import BrandLogo from '@/components/ui/BrandLogo';
import { cn } from '@/components/ui/cn';
import {
  DashboardIcon,
  type DashboardIconName,
} from '@/components/profesional/dashboard/DashboardUI';
import ProfessionalNotificationBell from '@/components/profesional/notifications/ProfessionalNotificationBell';
import { resolveAssetUrl } from '@/utils/assetUrl';

type MenuItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
  disabled?: boolean;
  requiredPlan?: ProfessionalPlanCode;
  featureKey?: ProfessionalFeatureKey;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Agenda', href: '/profesional/dashboard', icon: 'agenda' },
      { label: 'Reservas', href: '/profesional/dashboard/reservas', icon: 'reservas' },
      { label: 'Notificaciones', href: '/profesional/notificaciones', icon: 'notificaciones' },
      { label: 'Horarios de trabajo', href: '/profesional/dashboard/horarios', icon: 'horarios' },
      {
        label: 'Servicios',
        href: '/profesional/dashboard/servicios',
        icon: 'servicios',
        featureKey: 'onlinePayments',
      },
    ],
  },
  {
    label: 'Presencia pública',
    items: [
      {
        label: 'Perfil del negocio',
        href: '/profesional/dashboard/perfil-negocio',
        icon: 'negocio',
        featureKey: 'enhancedPublicProfile',
      },
      {
        label: 'Página pública',
        href: '/profesional/dashboard/pagina-publica',
        icon: 'publica',
        featureKey: 'enhancedPublicProfile',
      },
      {
        label: 'Reseñas',
        href: '/profesional/dashboard/resenas',
        icon: 'resenas',
      },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { label: 'Facturación', href: '/profesional/dashboard/billing', icon: 'plan' },
      { label: 'Configuración', href: '/profesional/dashboard/configuracion', icon: 'configuracion' },
    ],
  },
];

type SidebarProps = {
  profile?: ProfessionalProfile | null;
  active: string;
};

function ProfesionalSidebar({ profile, active }: SidebarProps) {
  const { requestNavigation } = useProfessionalDashboardUnsavedChanges();
  const rootRef = useRef<HTMLElement | null>(null);

  const initials = useMemo(() => {
    if (!profile?.fullName) return 'PR';
    return profile.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.fullName]);

  const displayName = profile?.fullName || 'Profesional';
  const displayMeta = profile?.rubro || 'Cuenta profesional';
  const resolvedLogoUrl = resolveAssetUrl(profile?.logoUrl);

  const planLabel = profile?.professionalPlan
    ? PLAN_LABELS[profile.professionalPlan]
    : 'Beta';

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const activeItem = rootRef.current?.querySelector<HTMLElement>('[data-sidebar-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <aside
      ref={rootRef}
      className="relative min-h-full overflow-x-hidden rounded-r-[28px] border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] px-5 py-6 text-[color:var(--ink)]"
    >
      <div className="border-b border-[color:var(--border-soft)] pb-5">
        <div className="flex justify-center">
          <BrandLogo href="/" variant="mobile" className="justify-center" />
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-[color:var(--border-soft)] bg-white text-base font-semibold text-[color:var(--primary)] shadow-[var(--shadow-card)]">
            {resolvedLogoUrl ? (
              <Image
                src={resolvedLogoUrl}
                alt={`Logo de ${displayName}`}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge variant="success" className="px-2 py-1 text-[0.56rem] tracking-[0.14em]">
              Profesional
            </Badge>
            <span className="rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--premium-strong)]">
              {planLabel}
            </span>
          </div>
          <div className="mt-3 min-w-0 max-w-full">
            <p className="truncate text-[1rem] font-semibold">{displayName}</p>
            <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{displayMeta}</p>
          </div>
        </div>

        <ProfessionalNotificationBell onNavigate={requestNavigation} />
      </div>

      <div className="relative mt-5 space-y-5">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="px-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-muted)]">
              {section.label}
            </p>
            <nav className="mt-2.5 space-y-1.5">
              {section.items.map((item) => {
                const isActive = item.label === active;
                const hintedPlan = item.featureKey ? requiredPlanForFeature(item.featureKey) : null;
                const showsFeatureHint = item.featureKey
                  ? !canAccessProfessionalFeature(profile, item.featureKey)
                  : false;
                const isLocked = item.requiredPlan
                  ? !hasPlanAccess(profile?.professionalPlan, item.requiredPlan)
                  : false;
                const isDisabled = item.disabled || isLocked;
                const itemClassName = cn(
                  'group flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition',
                  isActive && !isLocked
                    ? 'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] text-[color:var(--primary-strong)] shadow-[var(--shadow-card)]'
                    : isDisabled
                      ? 'cursor-not-allowed border-[color:var(--border-soft)] bg-white/60 text-[color:var(--ink-faint)]'
                      : 'border-transparent bg-transparent text-[color:var(--ink)] hover:border-[color:var(--border-soft)] hover:bg-white',
                );

                const content = (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border',
                        isActive && !isLocked
                          ? 'border-white bg-white text-[color:var(--primary)]'
                          : isLocked
                            ? 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink-faint)]'
                            : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', isLocked && 'opacity-60')}>
                      {item.label}
                    </span>
                    {(isLocked && item.requiredPlan) || (showsFeatureHint && hintedPlan) ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--premium-strong)]"
                        title={`Disponible en el plan ${PLAN_LABELS[(item.requiredPlan || hintedPlan)!]}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        {PLAN_LABELS[(item.requiredPlan || hintedPlan)!]}
                      </span>
                    ) : null}
                  </>
                );

                if (!item.href || isDisabled) {
                  return (
                    <div
                      key={item.label}
                      className={itemClassName}
                      data-sidebar-active={isActive ? 'true' : 'false'}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={itemClassName}
                    data-sidebar-active={isActive ? 'true' : 'false'}
                    onClick={(event) => {
                      event.preventDefault();
                      requestNavigation(item.href);
                    }}
                  >
                    {content}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default memo(ProfesionalSidebar);
