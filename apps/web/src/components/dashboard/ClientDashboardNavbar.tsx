import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { clearAuthAccessToken } from '@/services/session';

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
  const { clearProfile: clearClientProfile } = useClientProfileContext();
  const { clearProfile: clearProfessionalProfile } = useProfessionalProfileContext();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthAccessToken();
      clearProfessionalProfile();
      clearClientProfile();
      router.push('/cliente/auth/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
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

          <Logo href="/cliente/inicio" size={38} priority textClassName="text-[color:var(--ink)]" />
        </div>

        <nav className="hidden items-center gap-2 text-sm font-semibold text-[color:var(--ink)] md:flex">
          <Link
            href="/explorar"
            className="rounded-full px-3 py-2 transition hover:bg-white/88"
          >
            Explorar
          </Link>
          <Link
            href="/cliente/reservas"
            className="rounded-full px-3 py-2 transition hover:bg-white/88"
          >
            Mis reservas
          </Link>
          <Link
            href="/cliente/favoritos"
            className="rounded-full px-3 py-2 transition hover:bg-white/88"
          >
            Favoritos
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <details className="group relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-white/96 px-2 pr-3 text-xs font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:bg-white [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-soft)]">
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
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-44 rounded-[18px] border border-[color:var(--border-soft)] bg-white/98 p-1.5 shadow-[var(--shadow-lift)]">
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
                onClick={handleLogout}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2]"
              >
                Cerrar sesión
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
