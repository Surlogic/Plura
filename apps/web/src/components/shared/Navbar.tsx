'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/services/api';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import Logo from '@/components/ui/Logo';

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

export default function Navbar({
  variant = 'default',
  showMenuButton = false,
  onMenuClick,
}: NavbarProps) {
  const router = useRouter();
  const {
    clearProfile: clearProfessionalProfile,
    profile: professionalProfile,
    hasLoaded: professionalHasLoaded,
    isLoading: professionalLoading,
  } = useProfessionalProfileContext();
  const {
    clearProfile: clearClientProfile,
    profile: clientProfile,
    hasLoaded: clientHasLoaded,
    isLoading: clientLoading,
  } = useClientProfileContext();
  const isAuthPage = router.pathname.startsWith('/cliente/auth') ||
    router.pathname.startsWith('/profesional/auth');
  const showAuthLoading = !isAuthPage && (
    (router.pathname.startsWith('/profesional/dashboard') &&
      (!professionalHasLoaded || professionalLoading)) ||
    ((router.pathname.startsWith('/cliente') ||
      router.pathname.startsWith('/explorar') ||
      router.pathname.startsWith('/reservar')) &&
      (!clientHasLoaded || clientLoading)));
  const role: 'PUBLIC' | 'CLIENT' | 'PROFESSIONAL' = professionalProfile
    ? 'PROFESSIONAL'
    : clientProfile
      ? 'CLIENT'
      : 'PUBLIC';
  const displayName = professionalProfile?.fullName || clientProfile?.fullName || '';
  const initials = getInitials(displayName || 'Perfil');

  const handleLogout = () => {
    api
      .post('/auth/logout')
      .catch(() => undefined)
      .finally(() => {
        clearProfessionalProfile();
        clearClientProfile();
        if (role === 'PROFESSIONAL') {
          router.push('/profesional/auth/login');
          return;
        }
        router.push('/cliente/auth/login');
      });
  };

  const isDashboard = variant === 'dashboard';
  const headerClassName = isDashboard
    ? 'border-b border-[#0E2A47]/10 bg-[#F4F6F8]'
    : 'sticky top-0 z-50 border-b border-[#0E2A47]/10 bg-[#F4F6F8]/95 backdrop-blur';
  const containerClassName = isDashboard
    ? 'mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10'
    : 'mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10';

  return (
    <header className={headerClassName}>
      <div className={containerClassName}>
        <div className="flex items-center gap-3">
          {showMenuButton ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex items-center justify-center rounded-full border border-[#0E2A47]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:hidden"
            >
              Menú
            </button>
          ) : null}
          <Logo href="/" size={38} priority textClassName="text-[#0E2A47]" />
        </div>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          {showAuthLoading ? (
            <span className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#64748B] shadow-sm">
              Cargando...
            </span>
          ) : role === 'PROFESSIONAL' ? (
            <>
              <Link
                href="/explorar"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Explorar
              </Link>
              <Link
                href="/profesional/dashboard"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Mi dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Cerrar sesión
              </button>
            </>
          ) : role === 'CLIENT' ? (
            <>
              <Link
                href="/explorar"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Explorar
              </Link>
              <Link
                href="/cliente/reservas"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Mis reservas
              </Link>
              <Link
                href="/cliente/favoritos"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Favoritos
              </Link>
              <Link
                href="/cliente/perfil"
                className="inline-flex items-center gap-2 rounded-full border border-[#0E2A47]/10 bg-white px-2 py-1.5 pr-3 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E9EEF2] text-xs font-semibold">
                  {initials}
                </span>
                <span className="font-medium">Perfil</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/explorar"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Explorar
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/cliente/auth/register"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Crear cuenta
              </Link>
              <Link
                href="/profesional/auth/login"
                className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Soy profesional
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
