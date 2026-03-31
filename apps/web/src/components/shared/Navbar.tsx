import Link from 'next/link';
import { memo } from 'react';
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

  return (
    <header className={headerClassName}>
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          {showMenuButton ? (
            <Button type="button" onClick={onMenuClick} size="sm" className="lg:hidden">
              Menú
            </Button>
          ) : null}
          <BrandLogo href="/" variant="navbar" priority />
        </div>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          <ThemeSwitcher variant="compact" showLabel={false} className="self-start sm:self-auto" />
          {role === 'PROFESSIONAL' ? (
            <>
              <Button href="/explorar" size="md">
                Explorar
              </Button>
              <Button href="/profesional/dashboard" size="md">
                Mi dashboard
              </Button>
              <Button
                type="button"
                onClick={() => void logout('PROFESSIONAL')}
                variant="primary"
                size="md"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Button>
            </>
          ) : role === 'CLIENT' ? (
            <>
              <Button href="/explorar" size="md">
                Explorar
              </Button>
              <Button href="/cliente/reservas" size="md">
                Mis reservas
              </Button>
              <Button href="/cliente/favoritos" size="md">
                Favoritos
              </Button>
              <Link
                href="/cliente/perfil"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-2 py-1.5 pr-3 text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]"
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
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Button>
            </>
          ) : (
            <>
              <Button href="/explorar" size="md">
                Explorar
              </Button>
              <Button href="/login" size="md">
                Iniciar sesión
              </Button>
              <Button href="/cliente/auth/register" size="md">
                Crear cuenta
              </Button>
              <Button href="/profesional/auth/login" variant="primary" size="md">
                Soy profesional
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
});
