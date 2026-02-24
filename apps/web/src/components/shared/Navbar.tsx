'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { clearProfessionalToken, getProfessionalToken } from '@/services/session';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

export default function Navbar() {
  const router = useRouter();
  const { clearProfile } = useProfessionalProfileContext();
  const [hasProfessionalSession, setHasProfessionalSession] = useState(false);

  useEffect(() => {
    setHasProfessionalSession(Boolean(getProfessionalToken()));
  }, [router.pathname]);

  const handleLogout = () => {
    clearProfessionalToken();
    clearProfile();
    setHasProfessionalSession(false);
    router.push('/profesional/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#0E2A47]/10 bg-[#F4F6F8]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
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
