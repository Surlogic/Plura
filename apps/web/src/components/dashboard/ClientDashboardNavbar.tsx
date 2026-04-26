import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuthLogout } from '@/hooks/useAuthLogout';
import Button from '@/components/ui/Button';
import BrandLogo from '@/components/ui/BrandLogo';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import ClientNotificationBell from '@/components/cliente/notifications/ClientNotificationBell';

type ClientDashboardNavbarProps = {
  name: string;
  onOpenSidebar?: () => void;
  exploreViewToggle?: ReactNode;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function ClientDashboardNavbar({
  name,
  onOpenSidebar,
  exploreViewToggle,
}: ClientDashboardNavbarProps) {
  const router = useRouter();
  const { isLoggingOut, logout } = useAuthLogout();

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenSidebar ? (
            <Button
              type="button"
              onClick={onOpenSidebar}
              size="sm"
              className="h-10 w-10 px-0 lg:hidden"
              aria-label="Abrir menu cliente"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          ) : null}
          <BrandLogo href="/cliente/inicio" variant="navbar" priority />
        </div>
        {exploreViewToggle ? (
          <div className="order-3 flex w-full justify-center lg:order-2 lg:w-auto lg:flex-1">
            {exploreViewToggle}
          </div>
        ) : null}

        <nav className="hidden items-center gap-2 text-sm font-semibold text-[color:var(--ink)] md:flex">
          <Link
            href="/explorar"
            className="rounded-full px-3 py-2 transition hover:bg-[color:var(--surface-soft)]"
          >
            Explorar
          </Link>
          <Link
            href="/cliente/reservas"
            className="rounded-full px-3 py-2 transition hover:bg-[color:var(--surface-soft)]"
          >
            Mis reservas
          </Link>
          <Link
            href="/cliente/favoritos"
            className="rounded-full px-3 py-2 transition hover:bg-[color:var(--surface-soft)]"
          >
            Favoritos
          </Link>
        </nav>

        <div className={`flex items-center gap-2 sm:gap-3 ${exploreViewToggle ? 'order-2 lg:order-4' : ''}`}>
          <ThemeSwitcher variant="compact" showLabel={false} className="hidden md:flex" />
          <ClientNotificationBell
            onNavigate={(href) => {
              void router.push(href);
            }}
          />
          <details className="group relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-2 pr-3 text-xs font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:bg-[color:var(--surface-hover)] [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                {getInitials(name)}
              </span>
              <span className="hidden sm:inline">Perfil</span>
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M5.5 7.5L10 12l4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-44 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-1.5 shadow-[var(--shadow-lift)]">
              <Link
                href="/cliente/perfil"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-soft)]"
              >
                Mi perfil
              </Link>
              <Link
                href="/cliente/configuracion"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-soft)]"
              >
                Configuración
              </Link>
              <button
                type="button"
                onClick={() => void logout('CLIENT')}
                disabled={isLoggingOut}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[color:var(--error)] transition hover:bg-[color:var(--error-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
