import Link from 'next/link';
import { memo, type ReactNode } from 'react';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { useAuthLogout } from '@/hooks/useAuthLogout';
import Button from '@/components/ui/Button';
import BrandLogo from '@/components/ui/BrandLogo';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';

type NavbarProps = {
  variant?: 'default' | 'dashboard';
  showMenuButton?: boolean;
  onMenuClick?: () => void;
  exploreViewToggle?: ReactNode;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default memo(function Navbar({
  variant = 'default',
  showMenuButton = false,
  onMenuClick,
  exploreViewToggle,
}: NavbarProps) {
  const { profile: professionalProfile } = useProfessionalProfileContext();
  const { profile: clientProfile } = useClientProfileContext();
  const { isLoggingOut, logout } = useAuthLogout();
  const role: 'PUBLIC' | 'CLIENT' | 'PROFESSIONAL' = professionalProfile
    ? 'PROFESSIONAL'
    : clientProfile
      ? 'CLIENT'
      : 'PUBLIC';
  const displayName = professionalProfile?.fullName || clientProfile?.fullName || '';
  const initials = getInitials(displayName || 'Perfil');

  const isDashboard = variant === 'dashboard';
  const headerClassName = isDashboard
    ? 'border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/88 backdrop-blur-xl'
    : 'sticky top-0 z-50 border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/84 backdrop-blur-xl';
  const navButtonClassName = 'h-10 px-3.5';
  const compactThemeSwitcherClassName =
    'self-start sm:self-auto [&>div]:p-0.5 [&_button]:h-7 [&_button]:w-7';

  return (
    <header className={headerClassName}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-10">
        <div className="flex items-center gap-2.5">
          {showMenuButton ? (
            <Button type="button" onClick={onMenuClick} size="sm" className="lg:hidden">
              Menú
            </Button>
          ) : null}
          <BrandLogo href="/" variant="navbar" priority />
        </div>
        {exploreViewToggle ? (
          <div className="order-3 flex w-full justify-center lg:order-2 lg:w-auto lg:flex-1">
            {exploreViewToggle}
          </div>
        ) : null}
        <div
          className={`flex flex-col gap-2 text-sm sm:flex-row sm:items-center ${
            exploreViewToggle ? 'order-2 lg:order-3' : ''
          }`}
        >
          {role !== 'PUBLIC' ? (
            <ThemeSwitcher
              variant="compact"
              showLabel={false}
              className={compactThemeSwitcherClassName}
            />
          ) : null}
          {role === 'PROFESSIONAL' ? (
            <>
              <Button href="/explorar" size="md" className={navButtonClassName}>
                Explorar
              </Button>
              <Button href="/profesional/dashboard" size="md" className={navButtonClassName}>
                Mi dashboard
              </Button>
              <Button
                type="button"
                onClick={() => void logout('PROFESSIONAL')}
                variant="primary"
                size="md"
                className={navButtonClassName}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Button>
            </>
          ) : role === 'CLIENT' ? (
            <>
              <Button href="/explorar" size="md" className={navButtonClassName}>
                Explorar
              </Button>
              <Button href="/cliente/reservas" size="md" className={navButtonClassName}>
                Mis reservas
              </Button>
              <Button href="/cliente/favoritos" size="md" className={navButtonClassName}>
                Favoritos
              </Button>
              <Link
                href="/cliente/perfil"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-2 py-1 pr-3 text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-xs font-semibold text-[color:var(--primary)]">
                  {initials}
                </span>
                <span className="font-medium">Perfil</span>
              </Link>
              <Button
                type="button"
                onClick={() => void logout('CLIENT')}
                variant="primary"
                size="md"
                className={navButtonClassName}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Button>
            </>
          ) : (
            <>
              <Button href="/explorar" size="md" className={navButtonClassName}>
                Explorar
              </Button>
              <Button href="/login" size="md" className={navButtonClassName}>
                Iniciar sesión
              </Button>
              <Button
                href="/profesional/auth/login"
                variant="primary"
                size="md"
                className={navButtonClassName}
              >
                Soy profesional
              </Button>
              <ThemeSwitcher
                variant="compact"
                showLabel={false}
                className={compactThemeSwitcherClassName}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
});
