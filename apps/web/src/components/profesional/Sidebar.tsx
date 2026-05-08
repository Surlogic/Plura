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
import { cn } from '@/components/ui/cn';
import {
  DashboardIcon,
  type DashboardIconName,
} from '@/components/profesional/dashboard/DashboardUI';
import ProfessionalNotificationBell from '@/components/profesional/notifications/ProfessionalNotificationBell';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { buildProfessionalMediaStyle } from '@/utils/professionalMediaPresentation';

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
      {
        label: 'Equipo',
        href: '/profesional/dashboard/equipo',
        icon: 'equipo',
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
      { label: 'Acceso', href: '/profesional/dashboard/acceso', icon: 'configuracion' },
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
      className="relative min-h-full overflow-x-hidden border-r border-[#E5E7EB] bg-white px-3 py-3 pb-5 text-[color:var(--ink)] [scrollbar-color:#CBD5E1_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
    >
      <div className="border-b border-[#EEF2F7] pb-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--primary)] text-[0.75rem] font-semibold leading-none text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            P
          </Link>
          <span className="shrink-0 rounded-full bg-[#EEFDF8] px-1.5 py-0.5 text-[0.48rem] font-semibold uppercase leading-none tracking-[0.08em] text-[#0F766E]">
            {planLabel}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5 rounded-[8px] bg-[#F8FAFC] px-2.5 py-2 ring-1 ring-[#EEF2F7]">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white text-xs font-semibold text-[color:var(--primary)] ring-1 ring-[#E5E7EB]">
            {resolvedLogoUrl ? (
              <Image
                src={resolvedLogoUrl}
                alt={`Logo de ${displayName}`}
                fill
                sizes="56px"
                className="object-cover"
                style={buildProfessionalMediaStyle(profile?.logoMedia)}
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 flex-1 truncate text-[0.83rem] font-semibold leading-4 text-[#111827]">{displayName}</p>
              <Badge
                variant="success"
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.44rem] leading-none tracking-[0.08em]"
              >
                Profesional
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[0.7rem] leading-4 text-[color:var(--ink-muted)]">{displayMeta}</p>
          </div>
        </div>

        <ProfessionalNotificationBell onNavigate={requestNavigation} />
      </div>

      <div className="relative mt-3 space-y-3">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="px-1.5 text-[0.52rem] font-semibold uppercase leading-3 tracking-[0.14em] text-[#94A3B8]">
              {section.label}
            </p>
            <nav className="mt-1 space-y-0.5">
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
                  'group relative flex min-h-[42px] w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  isActive && !isLocked
                    ? 'bg-[#ECFDF5] text-[#0F3D35]'
                    : isDisabled
                      ? 'cursor-not-allowed bg-transparent text-[color:var(--ink-faint)]'
                      : 'bg-transparent text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
                );

                const content = (
                  <>
                    {isActive && !isLocked ? (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#0F766E]" />
                    ) : null}
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]',
                        isActive && !isLocked
                          ? 'bg-white text-[#0F766E] shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
                          : isLocked
                            ? 'bg-transparent text-[color:var(--ink-faint)]'
                            : 'bg-transparent text-[#64748B] group-hover:bg-white group-hover:text-[#0F172A]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-[15px] w-[15px]" />
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-[0.82rem] font-medium', isLocked && 'opacity-60')}>
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
