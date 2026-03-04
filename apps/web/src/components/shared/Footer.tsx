'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from '@/components/ui/Logo';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';

export default function Footer() {
  const router = useRouter();
  const { profile: clientProfile, hasLoaded: clientHasLoaded, isLoading: clientLoading } =
    useClientProfileContext();
  const {
    profile: professionalProfile,
    hasLoaded: professionalHasLoaded,
    isLoading: professionalLoading,
  } = useProfessionalProfileContext();

  const pathForCheck = router.pathname || '';
  const isClientArea = pathForCheck.startsWith('/cliente');
  const isProfessionalArea = pathForCheck.startsWith('/profesional/dashboard');

  const isLoadingSession =
    (isClientArea && (!clientHasLoaded || clientLoading)) ||
    (isProfessionalArea && (!professionalHasLoaded || professionalLoading));

  if (isLoadingSession) {
    return null;
  }

  const role: 'PUBLIC' | 'CLIENT' | 'PROFESSIONAL' = professionalProfile
    ? 'PROFESSIONAL'
    : clientProfile
      ? 'CLIENT'
      : 'PUBLIC';

  return (
    <footer className="mt-16 border-t border-[#0E2A47]/10 bg-[#F4F6F8] text-[#0E2A47]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-10">
        <div className="space-y-3">
          <Logo href="/" size={30} textClassName="text-[#0E2A47]" />
          <p className="text-sm text-[#6B7280]">
            Tu próximo turno, en segundos.
          </p>
        </div>
        {role === 'PROFESSIONAL' ? (
          <>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Plura</p>
              <Link href="/profesional/dashboard" className="block hover:text-[#0E2A47]">
                Panel profesional
              </Link>
              <Link href="/profesional/dashboard" className="block hover:text-[#0E2A47]">
                Agenda
              </Link>
              <Link href="/profesional/dashboard/servicios" className="block hover:text-[#0E2A47]">
                Servicios
              </Link>
              <Link href="/profesional/dashboard/reservas" className="block hover:text-[#0E2A47]">
                Reservas
              </Link>
            </div>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Soporte</p>
              <p>Centro de ayuda</p>
              <p>Contactar soporte</p>
            </div>
          </>
        ) : role === 'CLIENT' ? (
          <>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Plura</p>
              <Link href="/explorar" className="block hover:text-[#0E2A47]">
                Explorar
              </Link>
              <Link href="/cliente/reservas" className="block hover:text-[#0E2A47]">
                Mis reservas
              </Link>
              <Link href="/cliente/favoritos" className="block hover:text-[#0E2A47]">
                Favoritos
              </Link>
            </div>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Soporte</p>
              <p>Centro de ayuda</p>
              <p>Contactar soporte</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Plataforma</p>
              <p>Cómo funciona</p>
              <p>Planes para negocios</p>
              <p>Ayuda y soporte</p>
            </div>
            <div className="space-y-2 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#0E2A47]">Comunidad</p>
              <p>Profesionales destacados</p>
              <p>Reseñas reales</p>
              <p>Recomendaciones</p>
            </div>
          </>
        )}
        <div className="space-y-2 text-sm text-[#6B7280]">
          <p className="font-semibold text-[#0E2A47]">Contacto</p>
          <p>hola@plura.com</p>
          <p>Buenos Aires, AR</p>
        </div>
      </div>
      <div className="border-t border-[#0E2A47]/10 px-4 py-6 text-center text-xs text-[#6B7280]">
        © 2026 Plura. Todos los derechos reservados.
      </div>
    </footer>
  );
}
