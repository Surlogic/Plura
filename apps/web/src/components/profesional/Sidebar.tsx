import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import type { ProfessionalProfile } from '@/types/professional';
import { useProfessionalDashboardUnsavedChanges } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import Badge from '@/components/ui/Badge';
import BrandLogo from '@/components/ui/BrandLogo';
import { cn } from '@/components/ui/cn';
import {
  DashboardIcon,
  type DashboardIconName,
} from '@/components/profesional/dashboard/DashboardUI';

type MenuItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
  disabled?: boolean;
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
      { label: 'Horarios de trabajo', href: '/profesional/dashboard/horarios', icon: 'horarios' },
      { label: 'Servicios', href: '/profesional/dashboard/servicios', icon: 'servicios' },
    ],
  },
  {
    label: 'Presencia pública',
    items: [
      { label: 'Perfil del negocio', href: '/profesional/dashboard/perfil-negocio', icon: 'negocio' },
      { label: 'Página pública', href: '/profesional/dashboard/pagina-publica', icon: 'publica' },
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

export default function ProfesionalSidebar({ profile, active }: SidebarProps) {
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

  const planLabel = profile?.planCode
    ? {
        BASIC: 'Basic',
        PROFESSIONAL: 'Professional',
        COMPANY: 'Company',
      }[profile.planCode]
    : 'Beta';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const activeItem = root.querySelector<HTMLElement>('[data-sidebar-active="true"]');
    if (!activeItem) return;

    const findScrollableAncestor = () => {
      let current = activeItem.parentElement;
      while (current) {
        const styles = window.getComputedStyle(current);
        const overflowY = styles.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
        if (canScroll) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const scrollContainer = findScrollableAncestor();
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const itemCenter = itemRect.top - containerRect.top + scrollContainer.scrollTop + (itemRect.height / 2);
    const targetScrollTop = itemCenter - (scrollContainer.clientHeight / 2);

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
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
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-[color:var(--border-soft)] bg-white text-base font-semibold text-[color:var(--primary)] shadow-[var(--shadow-card)]">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={`Logo de ${displayName}`}
                className="h-full w-full object-cover"
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
                const className = cn(
                  'group flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition',
                  isActive
                    ? 'border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] text-[color:var(--primary-strong)] shadow-[var(--shadow-card)]'
                    : item.disabled
                      ? 'cursor-not-allowed border-[color:var(--border-soft)] bg-white/60 text-[color:var(--ink-faint)]'
                      : 'border-transparent bg-transparent text-[color:var(--ink)] hover:border-[color:var(--border-soft)] hover:bg-white',
                );

                const content = (
                  <>
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border',
                        isActive
                          ? 'border-white bg-white text-[color:var(--primary)]'
                          : 'border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)]',
                      )}
                    >
                      <DashboardIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {item.label}
                    </span>
                  </>
                );

                if (!item.href || item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className={className}
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
                    className={className}
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
