import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ProfessionalProfile } from '@/types/professional';
import {
  canAccessProfessionalFeature,
  type ProfessionalFeatureKey,
} from '@/lib/billing/featureGuards';
import { useProfessionalDashboardUnsavedChanges } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { fetchAuthMe, hasContext, selectAuthContext } from '@/lib/auth/contexts';
import { cn } from '@/components/ui/cn';
import {
  DashboardIcon,
  type DashboardIconName,
} from '@/components/profesional/dashboard/DashboardUI';
import { useProfessionalNotificationUnreadCount } from '@/hooks/useProfessionalNotificationUnreadCount';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { buildProfessionalMediaStyle } from '@/utils/professionalMediaPresentation';

type MenuItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
  disabled?: boolean;
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
    label: 'Negocio',
    items: [
      {
        label: 'Presencia pública',
        href: '/profesional/dashboard/presencia-publica',
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

const formatNotificationBadgeCount = (count: number) => {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
};

type SidebarProps = {
  profile?: ProfessionalProfile | null;
  active: string;
  onRequestHide?: () => void;
};

function ProfesionalSidebar({ profile, active, onRequestHide }: SidebarProps) {
  const router = useRouter();
  const { requestNavigation } = useProfessionalDashboardUnsavedChanges();
  const { clearProfile: clearProfessionalProfile } = useProfessionalProfileContext();
  const rootRef = useRef<HTMLElement | null>(null);
  const { count: unreadNotificationCount } = useProfessionalNotificationUnreadCount();
  const [canEnterAsClient, setCanEnterAsClient] = useState(false);
  const [isSwitchingContext, setIsSwitchingContext] = useState(false);

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

  const planLabel = 'Core';
  const notificationBadgeCount = formatNotificationBadgeCount(unreadNotificationCount);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const activeItem = rootRef.current?.querySelector<HTMLElement>('[data-sidebar-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  useEffect(() => {
    let isActive = true;

    const loadAvailableContexts = async () => {
      try {
        const me = await fetchAuthMe();
        if (isActive) {
          setCanEnterAsClient(hasContext(me.contexts, 'CLIENT'));
        }
      } catch {
        if (isActive) {
          setCanEnterAsClient(false);
        }
      }
    };

    void loadAvailableContexts();

    return () => {
      isActive = false;
    };
  }, []);

  const handleEnterAsClient = async () => {
    if (isSwitchingContext) {
      return;
    }

    setIsSwitchingContext(true);
    try {
      await selectAuthContext('CLIENT');
      clearProfessionalProfile();
      await router.push('/cliente/inicio');
    } catch {
      setIsSwitchingContext(false);
    }
  };

  return (
    <aside
      ref={rootRef}
      className="relative flex min-h-full flex-col overflow-x-hidden border-r border-[#E2E8F0] bg-white text-[#0F172A] [scrollbar-color:#CBD5E1_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
    >
      <div className="border-b border-[#E2E8F0] px-4 py-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-3">
          <div className="mb-2 flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#ECFDF5] text-xs font-semibold text-[#0F766E]">
            {resolvedLogoUrl ? (
              <Image
                src={resolvedLogoUrl}
                alt={`Logo de ${displayName}`}
                fill
                sizes="40px"
                className="object-cover"
                style={buildProfessionalMediaStyle(profile?.logoMedia)}
              />
            ) : (
              initials
            )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0F172A]">{displayName}</p>
              <p className="truncate text-xs text-[#64748B]">{displayMeta}</p>
            </div>
          </div>
          <span className="inline-flex rounded-md bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#0F766E]">
            {planLabel}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuSections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-3 text-xs uppercase tracking-wider text-[#64748B]">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.label === active;
                const showsFeatureHint = item.featureKey
                  ? !canAccessProfessionalFeature(profile, item.featureKey)
                  : false;
                const isDisabled = Boolean(item.disabled);
                const itemClassName = cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  isActive && !isDisabled
                    ? 'bg-[#ECFDF5] text-[#0F766E]'
                    : isDisabled
                      ? 'cursor-not-allowed bg-transparent text-[color:var(--ink-faint)]'
                      : 'bg-transparent text-[#0F172A] hover:bg-[#ECFDF5]/50',
                );

                const content = (
                  <>
                    {isActive && !isDisabled ? (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#0F766E]" />
                    ) : null}
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center',
                        isActive && !isDisabled
                          ? 'text-[#0F766E]'
                          : isDisabled
                            ? 'bg-transparent text-[color:var(--ink-faint)]'
                            : 'bg-transparent text-[#0F172A]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-sm', isDisabled && 'opacity-60')}>
                      {item.label}
                    </span>
                    {item.label === 'Notificaciones' && notificationBadgeCount ? (
                      <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0F766E] px-1.5 py-0.5 text-xs leading-none text-white">
                        {notificationBadgeCount}
                      </span>
                    ) : null}
                    {showsFeatureHint ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--premium-soft)] bg-[color:var(--premium-soft)] px-2 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--premium-strong)]"
                        title="Funcionalidad no disponible en el MVP"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Próximamente
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
              {section.label === 'Cuenta' && canEnterAsClient ? (
                <button
                  type="button"
                  className="group relative flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-left text-[#0F172A] transition hover:bg-[#ECFDF5]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-wait disabled:opacity-70"
                  onClick={handleEnterAsClient}
                  disabled={isSwitchingContext}
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center bg-transparent text-[#0F172A]">
                    <DashboardIcon name="configuracion" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {isSwitchingContext ? 'Cambiando...' : 'Entrar como cliente'}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </nav>

      {onRequestHide ? (
        <div className="border-t border-[#E2E8F0] px-3 py-4">
          <button
            type="button"
            onClick={onRequestHide}
            className="group relative flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-left text-[#64748B] transition hover:bg-[#ECFDF5]/50 hover:text-[#0F766E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-current">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
                <path d="m11 7-5 5 5 5" />
                <path d="m18 7-5 5 5 5" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">Ocultar menú</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default memo(ProfesionalSidebar);
