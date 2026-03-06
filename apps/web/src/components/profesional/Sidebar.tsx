import Link from 'next/link';
import { useMemo } from 'react';
import type { ProfessionalProfile } from '@/types/professional';
import { useProfessionalDashboardUnsavedChanges } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import Badge from '@/components/ui/Badge';
import Logo from '@/components/ui/Logo';

type MenuItem = {
  label: string;
  href: string;
  disabled?: boolean; 
};

const menuItems: MenuItem[] = [
  { label: 'Perfil del negocio', href: '/profesional/dashboard/perfil-negocio' },
  { label: 'Agenda', href: '/profesional/dashboard' },
  { label: 'Página pública', href: '/profesional/dashboard/pagina-publica' },
  { label: 'Horarios de trabajo', href: '/profesional/dashboard/horarios' },
  { label: 'Servicios', href: '/profesional/dashboard/servicios' },
  { label: 'Reservas', href: '/profesional/dashboard/reservas' },
];

type SidebarProps = {
  profile?: ProfessionalProfile | null;
  active: string;
};

export default function ProfesionalSidebar({ profile, active }: SidebarProps) {
  const { requestNavigation } = useProfessionalDashboardUnsavedChanges();
  const initials = useMemo(() => {
    if (!profile?.fullName) return 'PR';
    return profile.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.fullName]);

  const displayName = profile?.fullName || 'Profesional';
  const displayMeta = profile?.rubro || profile?.email || 'Cuenta profesional';

  return (
    <aside className="h-full rounded-r-[28px] border-r border-white/8 bg-[linear-gradient(180deg,#081423,#0c1d34)] p-5 text-white">
      <div className="border-b border-white/10 pb-5">
        <Logo
          href="/"
          size={30}
          className="mb-4"
          textClassName="text-white"
        />
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/12 text-sm font-semibold">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={`Logo de ${displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <Badge variant="contrast" className="mb-2 px-2.5 py-1 text-[0.6rem] tracking-[0.22em] text-[#bcd2ea]">
              Profesional
            </Badge>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-white/60">{displayMeta}</p>
          </div>
        </div>
      </div>
      <p className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
        Navegación
      </p>
      <nav className="mt-3 space-y-2 text-sm font-semibold">
        {menuItems.map((item) => {
          const isActive = item.label === active;
          const className = `block w-full rounded-[16px] px-3 py-3 text-left transition ${
            isActive
              ? 'bg-white text-[#0b1d2a] shadow-[0_10px_30px_-24px_rgba(255,255,255,0.65)]'
              : item.disabled
                ? 'cursor-not-allowed bg-white/5 text-white/40'
                : 'bg-white/6 text-white hover:bg-white/10'
          }`;

          if (!item.href || item.disabled) {
            return (
              <div key={item.label} className={className}>
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={className}
              onClick={(event) => {
                event.preventDefault();
                requestNavigation(item.href);
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-[18px] border border-white/10 bg-white/6 p-4 text-xs text-white/70">
        Tip: completá tu perfil para aparecer en las búsquedas destacadas.
      </div>
    </aside>
  );
}
