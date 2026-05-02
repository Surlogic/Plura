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
import BrandLogo from '@/components/ui/BrandLogo';
import { cn } from '@/components/ui/cn';
import {
  DashboardIcon,
  type DashboardIconName,
} from '@/components/profesional/dashboard/DashboardUI';
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
      { label: 'Dashboard', href: '/profesional/dashboard', icon: 'agenda' },
      { label: 'Reservas', href: '/profesional/dashboard/reservas', icon: 'reservas' },
      { label: 'Horarios', href: '/profesional/dashboard/horarios', icon: 'horarios' },
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
      { label: 'Notificaciones', href: '/profesional/notificaciones', icon: 'notificaciones' },
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
      className="relative flex min-h-full flex-col overflow-x-hidden border-r border-[#E2E8F0] bg-white px-4 py-5 text-[color:var(--ink)]"
    >
      <div className="border-b border-[#E2E8F0] pb-4">
        <div className="px-1">
          <BrandLogo href="/" variant="mobile" className="justify-start" />
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[color:var(--border-soft)] bg-white text-sm font-semibold text-[color:var(--primary)]">
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
              <p className="truncate text-[0.92rem] font-semibold text-[#0F172A]">{displayName}</p>
              <p className="mt-0.5 truncate text-[0.78rem] text-[color:var(--ink-muted)]">{displayMeta}</p>
            </div>
          <span className="text-[#94A3B8]">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m6 8 4 4 4-4" />
            </svg>
          </span>
        </div>

      </div>

      <div className="relative mt-4 flex-1 space-y-4">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="px-1 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
              {section.label}
            </p>
            <nav className="mt-2 space-y-1">
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
                  'group flex w-full items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition',
                  isActive && !isLocked
                    ? 'border-[#BFEDE7] bg-[#ECFDF5] text-[#0F766E]'
                  : isDisabled
                      ? 'cursor-not-allowed border-transparent bg-transparent text-[color:var(--ink-faint)]'
                      : 'border-transparent bg-transparent text-[color:var(--ink)] hover:border-[#E2E8F0] hover:bg-[#F8FAFC]',
                );

                const content = (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border',
                        isActive && !isLocked
                          ? 'border-[#BFEDE7] bg-white text-[#0F766E]'
                          : isLocked
                            ? 'border-[#E2E8F0] bg-transparent text-[color:var(--ink-faint)]'
                            : 'border-[#E2E8F0] bg-white text-[color:var(--ink)]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-[15px] w-[15px]" />
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-[0.88rem] font-medium', isLocked && 'opacity-60')}>
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

      <div className="space-y-3 border-t border-[#E2E8F0] pt-4">
        <div className="rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-2 text-[#0F766E]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#BFEDE7] bg-white">
              <DashboardIcon name="plan" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.8rem] font-semibold text-[#0F172A]">Estás en {planLabel}</p>
              <p className="text-[0.72rem] text-[#64748B]">Gestioná tu plan y cobros.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => requestNavigation('/profesional/dashboard/billing')}
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#BFEDE7] bg-white px-3 text-xs font-semibold text-[#0F766E] transition hover:bg-[#F0FDFA]"
          >
            Ver plan
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-[16px] border border-[#E2E8F0] bg-white px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEE2E2] text-xs font-semibold text-[#BE123C]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-semibold text-[#0F172A]">{displayName}</p>
            <p className="truncate text-[0.72rem] text-[#64748B]">Centro operativo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(ProfesionalSidebar);
