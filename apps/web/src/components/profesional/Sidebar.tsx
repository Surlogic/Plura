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
import { useAuthLogout } from '@/hooks/useAuthLogout';
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
        icon: 'negocio',
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
      { label: 'Facturación', href: '/profesional/dashboard/billing', icon: 'facturacion' },
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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

function ProfesionalSidebar({
  profile,
  active,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const router = useRouter();
  const { requestNavigation } = useProfessionalDashboardUnsavedChanges();
  const { clearProfile: clearProfessionalProfile } = useProfessionalProfileContext();
  const rootRef = useRef<HTMLElement | null>(null);
  const { count: unreadNotificationCount } = useProfessionalNotificationUnreadCount();
  const { isLoggingOut, logout } = useAuthLogout();
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
      className="relative flex min-h-full flex-col overflow-x-hidden rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_18px_55px_rgba(15,23,42,0.06)] [scrollbar-color:#CBD5E1_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
    >
      <div className={cn('border-b border-[#E2E8F0]', collapsed ? 'px-0 py-5' : 'px-5 py-5')}>
        <div className={cn(collapsed ? 'flex justify-center' : 'flex items-start gap-4')}>
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'flex-col gap-3')}>
            <div
              className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#DFFBF2] font-semibold text-[#087A62]',
                collapsed ? 'h-11 w-11 text-base' : 'h-[52px] w-[52px] text-xl',
              )}
            >
            {resolvedLogoUrl ? (
              <Image
                src={resolvedLogoUrl}
                alt={`Logo de ${displayName}`}
                fill
                sizes={collapsed ? '44px' : '52px'}
                className="object-cover"
                style={buildProfessionalMediaStyle(profile?.logoMedia)}
              />
            ) : (
              initials
            )}
            </div>
            <span className={cn('inline-flex rounded-lg bg-[#DFFBF2] px-3 py-1 text-sm font-semibold leading-none text-[#087A62]', collapsed && 'sr-only')}>
              {planLabel}
            </span>
          </div>
          <div className={cn('min-w-0 flex-1 pt-1 transition-[max-width,opacity] duration-200', collapsed && 'max-w-0 overflow-hidden opacity-0')}>
            <p className="whitespace-normal text-lg font-semibold leading-tight text-[#111827]">{displayName}</p>
          </div>
        </div>
      </div>

      <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'px-2 py-5' : 'px-3 py-5')}>
        {menuSections.map((section, sectionIndex) => (
          <div key={section.label} className={cn(collapsed ? 'mb-6' : 'mb-6')}>
            {collapsed && sectionIndex > 0 ? (
              <div className="mx-auto mb-6 h-px w-9 bg-[#E2E8F0]" />
            ) : null}
            <p className={cn('mb-4 px-2 text-xs font-semibold uppercase tracking-normal text-[#64748B]', collapsed && 'sr-only')}>
              {section.label}
            </p>
            <div className={cn(collapsed ? 'space-y-4' : 'space-y-2')}>
              {section.items.map((item) => {
                const isActive = item.label === active;
                const showsFeatureHint = item.featureKey
                  ? !canAccessProfessionalFeature(profile, item.featureKey)
                  : false;
                const isDisabled = Boolean(item.disabled);
                const itemClassName = cn(
                  'group relative flex items-center text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  collapsed ? 'mx-auto h-11 w-11 justify-center rounded-xl p-0' : 'w-full gap-2.5 rounded-xl px-3 py-3',
                  isActive && !isDisabled
                    ? cn(
                        'bg-[#ECFDF5] text-[#087A62]',
                        collapsed ? 'shadow-none' : 'shadow-[inset_5px_0_0_#07966F]',
                      )
                    : isDisabled
                      ? 'cursor-not-allowed bg-transparent text-[color:var(--ink-faint)]'
                      : 'bg-transparent text-[#0F172A] hover:bg-[#ECFDF5]/50',
                );

                const content = (
                  <>
                    {isActive && !isDisabled && !collapsed ? (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#0F766E]" />
                    ) : null}
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center justify-center',
                        collapsed ? 'h-5 w-5' : 'h-5 w-5',
                        isActive && !isDisabled
                          ? 'text-[#087A62]'
                          : isDisabled
                            ? 'bg-transparent text-[color:var(--ink-faint)]'
                            : 'bg-transparent text-[#0F172A]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-5 w-5" />
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-sm font-medium transition-[max-width,opacity] duration-200',
                        isDisabled && 'opacity-60',
                        collapsed ? 'max-w-0 truncate opacity-0' : 'whitespace-nowrap',
                      )}
                    >
                      {item.label}
                    </span>
                    {item.label === 'Notificaciones' && notificationBadgeCount && !collapsed ? (
                      <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0F766E] px-1.5 py-0.5 text-xs leading-none text-white">
                        {notificationBadgeCount}
                      </span>
                    ) : null}
                    {showsFeatureHint && !collapsed ? (
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
                      title={collapsed ? item.label : undefined}
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
                    title={collapsed ? item.label : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      requestNavigation(item.href);
                    }}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('mt-auto py-5', collapsed ? 'px-2' : 'px-3')}>
        <div className={cn('mx-auto mb-4 h-px bg-[#E2E8F0]', collapsed ? 'w-9' : 'w-full')} />
        <div className={cn(collapsed ? 'space-y-4' : 'space-y-2')}>
          {onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                'group relative flex items-center bg-transparent text-left text-[#64748B] transition hover:bg-[#ECFDF5]/50 hover:text-[#0F766E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                collapsed ? 'mx-auto h-11 w-11 justify-center rounded-xl p-0' : 'w-full gap-2.5 rounded-xl px-3 py-2.5',
              )}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              aria-pressed={collapsed}
              title={collapsed ? 'Expandir menú' : undefined}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-current">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}>
                  <path d="m11 7-5 5 5 5" />
                  <path d="m18 7-5 5 5 5" />
                </svg>
              </span>
              <span className={cn('min-w-0 flex-1 text-sm font-medium transition-[max-width,opacity] duration-200', collapsed ? 'max-w-0 truncate opacity-0' : 'whitespace-nowrap')}>
                Contraer menú
              </span>
            </button>
          ) : null}

          {canEnterAsClient ? (
            <button
              type="button"
              className={cn(
                'group relative flex items-center bg-transparent text-left text-[#0F172A] transition hover:bg-[#ECFDF5]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-wait disabled:opacity-70',
                collapsed ? 'mx-auto h-11 w-11 justify-center rounded-xl p-0' : 'w-full gap-2.5 rounded-xl px-3 py-2.5',
              )}
              onClick={handleEnterAsClient}
              disabled={isSwitchingContext}
              title={collapsed ? 'Entrar como cliente' : undefined}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center bg-transparent text-[#0F172A]">
                <DashboardIcon name="entrarCliente" className="h-5 w-5" />
              </span>
              <span className={cn('min-w-0 flex-1 text-sm font-medium transition-[max-width,opacity] duration-200', collapsed ? 'max-w-0 truncate opacity-0' : 'whitespace-nowrap')}>
                {isSwitchingContext ? 'Cambiando...' : 'Entrar como cliente'}
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void logout('PROFESSIONAL')}
            disabled={isLoggingOut}
            className={cn(
              'group relative flex items-center bg-transparent text-left text-[#0F172A] transition hover:bg-[#ECFDF5]/50 hover:text-[#0F766E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-wait disabled:opacity-70',
              collapsed ? 'mx-auto h-11 w-11 justify-center rounded-xl p-0' : 'w-full gap-2.5 rounded-xl px-3 py-2.5',
            )}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-current">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
                <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
                <path d="M14 16l4-4-4-4" />
                <path d="M18 12H9" />
              </svg>
            </span>
            <span className={cn('min-w-0 flex-1 text-sm font-medium transition-[max-width,opacity] duration-200', collapsed ? 'max-w-0 truncate opacity-0' : 'whitespace-nowrap')}>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default memo(ProfesionalSidebar);
