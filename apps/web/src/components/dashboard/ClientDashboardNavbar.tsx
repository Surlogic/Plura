import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/services/api';

type ClientDashboardNavbarProps = {
  name: string;
  onOpenSidebar?: () => void;
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
}: ClientDashboardNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      router.push('/cliente/auth/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#0E2A47]/10 bg-[#F4F6F8]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E7EC] bg-white text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:hidden"
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
            </button>
          ) : null}

          <Link href="/cliente/inicio" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Plura"
              width={52}
              height={52}
              className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              priority
            />
            <span className="logo-type text-2xl text-[#0E2A47]">Plura</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 text-sm font-semibold text-[#0E2A47] md:flex">
          <Link
            href="/explorar"
            className="rounded-full px-3 py-2 transition hover:bg-white"
          >
            Explorar
          </Link>
          <Link
            href="/cliente/reservas"
            className="rounded-full px-3 py-2 transition hover:bg-white"
          >
            Reservas
          </Link>
          <Link
            href="/cliente/favoritos"
            className="rounded-full px-3 py-2 transition hover:bg-white"
          >
            Favoritos
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/explorar"
            className="hidden rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:inline-flex"
          >
            Ver mapa
          </Link>
          <Link
            href="/explorar"
            className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:text-sm"
          >
            Agendar ahora
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center rounded-full border border-[#E2E7EC] bg-white px-3 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Salir</span>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9EEF2] text-xs font-semibold text-[#0E2A47]">
            {getInitials(name)}
          </div>
        </div>
      </div>
    </header>
  );
}
