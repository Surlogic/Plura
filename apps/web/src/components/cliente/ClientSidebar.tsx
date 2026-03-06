import type { ReactElement } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

type IconProps = {
  className?: string;
};

export type ClientSidebarSection =
  | 'inicio'
  | 'reservas'
  | 'favoritos'
  | 'perfil'
  | 'configuracion';

type SidebarItem = {
  id: ClientSidebarSection;
  label: string;
  href: string;
  icon: (props: IconProps) => ReactElement;
};

const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const HeartIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.7-7 10-7 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const UserIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M19.4 13a7.7 7.7 0 0 0 .1-2l2-1.5-2-3.5-2.4.7a7.9 7.9 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.9 7.9 0 0 0-1.7 1l-2.4-.7-2 3.5 2 1.5a7.7 7.7 0 0 0 .1 2l-2 1.5 2 3.5 2.4-.7c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4.7 2-3.5-2-1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const sidebarItems: SidebarItem[] = [
  { id: 'inicio', label: 'Inicio', href: '/cliente/inicio', icon: HomeIcon },
  { id: 'reservas', label: 'Mis reservas', href: '/cliente/reservas', icon: CalendarIcon },
  { id: 'favoritos', label: 'Favoritos', href: '/cliente/favoritos', icon: HeartIcon },
  { id: 'perfil', label: 'Mi perfil', href: '/cliente/perfil', icon: UserIcon },
  { id: 'configuracion', label: 'Configuracion', href: '/cliente/configuracion', icon: SettingsIcon },
];

type ClientSidebarProps = {
  active: ClientSidebarSection;
  collapsed?: boolean;
  mobile?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
};

export default function ClientSidebar({
  active,
  collapsed = false,
  mobile = false,
  onToggleCollapsed,
  onNavigate,
}: ClientSidebarProps) {
  const isCollapsed = collapsed && !mobile;

  return (
    <Card
      tone="glass"
      padding="none"
      className={`transition-[padding] duration-300 ${isCollapsed ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className={`mb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 px-2`}>
        <p
          className={`text-[0.65rem] uppercase tracking-[0.3em] text-[color:var(--ink-faint)] transition-[max-width,opacity] duration-300 ${
            isCollapsed ? 'max-w-0 overflow-hidden opacity-0' : 'max-w-[120px] opacity-100'
          }`}
        >
          Menú
        </p>

        {onToggleCollapsed && !mobile ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink-muted)] transition hover:bg-[color:var(--surface-soft)]"
            aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            aria-pressed={isCollapsed}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path
                d="M7.5 5.5L12.5 10l-5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      <nav className="mt-2 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={`group relative flex items-center rounded-[14px] py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[color:var(--surface-soft)] text-[color:var(--ink)]'
                  : 'text-[color:var(--ink)] hover:bg-white/82'
              } ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  isActive
                    ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
                    : 'bg-white text-[color:var(--ink-muted)]'
                }`}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ${
                  isCollapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-[170px] opacity-100'
                }`}
              >
                {item.label}
              </span>

              {isCollapsed ? (
                <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-20 -translate-y-1/2 rounded-md bg-[color:var(--primary-strong)] px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-[var(--shadow-card)] transition group-hover:opacity-100">
                  {item.label}
                </span>
              ) : null}
              {isCollapsed ? (
                <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-10 h-2 w-2 -translate-y-1/2 rotate-45 bg-[color:var(--primary-strong)] opacity-0 transition group-hover:opacity-100" />
              ) : null}
              <span
                className={`absolute inset-y-2 left-0 w-1 rounded-r-full transition ${
                  isActive ? 'bg-[color:var(--accent)]' : 'bg-transparent'
                }`}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
