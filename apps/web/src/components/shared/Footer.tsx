import Link from 'next/link';
import { useRouter } from 'next/router';
import BrandLogo from '@/components/ui/BrandLogo';
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
  const isProfessionalAuth = pathForCheck.startsWith('/profesional/auth');
  const footerClassName = isProfessionalAuth
    ? 'mt-16 border-t border-white/12 bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_52%,var(--brand-navy-elevated)_100%)] text-[color:var(--text-on-dark)]'
    : 'mt-16 border-t border-[color:var(--border-soft)] bg-[color:var(--surface)]/82 text-[color:var(--ink)] backdrop-blur';
  const secondaryTextClassName = isProfessionalAuth ? 'text-[color:var(--text-on-dark-secondary)]' : 'text-[color:var(--ink-muted)]';
  const strongTextClassName = isProfessionalAuth ? 'font-semibold text-[color:var(--text-on-dark)]' : 'font-semibold text-[color:var(--ink)]';
  const linkClassName = isProfessionalAuth ? 'block transition hover:text-[color:var(--text-on-dark)]' : 'block transition hover:text-[color:var(--ink)]';

  return (
    <footer className={footerClassName}>
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-10">
        <div className="space-y-3">
          <BrandLogo
            href="/"
            variant="footer"
            logoVariant={isProfessionalAuth ? 'dark' : 'default'}
          />
          <p className={`text-sm ${secondaryTextClassName}`}>
            Tu próximo turno, en segundos.
          </p>
        </div>
        {role === 'PROFESSIONAL' ? (
          <>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Plura</p>
              <Link href="/profesional/dashboard" className={linkClassName}>
                Panel profesional
              </Link>
              <Link href="/profesional/dashboard" className={linkClassName}>
                Agenda
              </Link>
              <Link href="/profesional/dashboard/servicios" className={linkClassName}>
                Servicios
              </Link>
              <Link href="/profesional/dashboard/reservas" className={linkClassName}>
                Reservas
              </Link>
            </div>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Soporte</p>
              <p>Centro de ayuda</p>
              <p>Soporte prioritario</p>
            </div>
          </>
        ) : role === 'CLIENT' ? (
          <>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Plura</p>
              <Link href="/explorar" className={linkClassName}>
                Explorar
              </Link>
              <Link href="/cliente/reservas" className={linkClassName}>
                Mis reservas
              </Link>
              <Link href="/cliente/favoritos" className={linkClassName}>
                Favoritos
              </Link>
            </div>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Soporte</p>
              <p>Centro de ayuda</p>
              <p>Contactar soporte</p>
            </div>
          </>
        ) : (
          <>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Descubrir</p>
              <Link href="/explorar" className={linkClassName}>
                Explorar
              </Link>
              <Link href="/cliente/auth/register" className={linkClassName}>
                Crear cuenta
              </Link>
              <Link href="/login" className={linkClassName}>
                Iniciar sesión
              </Link>
            </div>
            <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
              <p className={strongTextClassName}>Profesionales</p>
              <Link href="/profesional/auth/login" className={linkClassName}>
                Soy profesional
              </Link>
              <Link href="/explorar" className={linkClassName}>
                Ver perfiles
              </Link>
            </div>
          </>
        )}
        <div className={`space-y-2 text-sm ${secondaryTextClassName}`}>
          <p className={strongTextClassName}>Contacto</p>
          <p>hola@plura.com</p>
          <p>Buenos Aires, AR</p>
        </div>
      </div>
      <div className={`border-t px-4 py-6 text-center text-xs ${secondaryTextClassName} ${isProfessionalAuth ? 'border-white/10' : 'border-[color:var(--border-soft)]'}`}>
        © 2026 Plura. Todos los derechos reservados.
      </div>
    </footer>
  );
}
