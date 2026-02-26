'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/services/api';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

type NavbarProps = {
  variant?: 'default' | 'dashboard';
  showMenuButton?: boolean;
  onMenuClick?: () => void;
};

export default function Navbar({
  variant = 'default',
  showMenuButton = false,
  onMenuClick,
}: NavbarProps) {
  const router = useRouter();
  const { clearProfile, profile, hasLoaded } = useProfessionalProfileContext();
  const hasProfessionalSession = hasLoaded && Boolean(profile);

  const handleLogout = () => {
    api
      .post('/auth/logout')
      .catch(() => undefined)
      .finally(() => {
        clearProfile();
        router.push('/profesional/auth/login');
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
          <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Plura"
            width={64}
            height={64}
            className="logo-animate relative z-10 h-16 w-16 object-contain"
            priority
          />
          <span className="logo-text-animate logo-type -ml-3 text-3xl text-[#0E2A47]">Plura</span>
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          {hasProfessionalSession ? (
            <>
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
          ) : (
            <>
              <Link
                href="/profesional/auth/login"
                className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Soy profesional o empresa
              </Link>
              <Link
                href="/cliente/auth/login"
                className="rounded-full bg-[#0E2A47] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Soy cliente
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
