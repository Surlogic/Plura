import Link from 'next/link';
import { useMemo } from 'react';
import type { ProfessionalProfile } from '@/types/professional';

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
    <aside className="h-full bg-[#0B1D2A] p-5 text-white">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
          {initials}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Profesional
          </p>
          <p className="text-sm font-semibold">{displayName}</p>
          <p className="text-xs text-white/60">{displayMeta}</p>
        </div>
      </div>
      <p className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
        Navegación
      </p>
      <nav className="mt-3 space-y-2 text-sm font-semibold">
        {menuItems.map((item) => {
          const isActive = item.label === active;
          const className = `block w-full rounded-lg px-3 py-3 text-left transition ${
            isActive
              ? 'bg-white text-[#0B1D2A]'
              : item.disabled
                ? 'cursor-not-allowed bg-white/5 text-white/40'
                : 'bg-white/5 text-white hover:bg-white/10'
          }`;

          if (!item.href || item.disabled) {
            return (
              <div key={item.label} className={className}>
                {item.label}
              </div>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/60">
        Tip: completá tu perfil para aparecer en las búsquedas destacadas.
      </div>
    </aside>
  );
}
