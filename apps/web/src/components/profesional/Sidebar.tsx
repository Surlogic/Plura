import Link from 'next/link';
import { useMemo } from 'react';
import type { ProfessionalProfile } from '@/types/professional';

type MenuItem = {
  label: string;
  href: string;
  disabled?: boolean; 
};

const menuItems: MenuItem[] = [
  { label: 'Perfil del negocio', href: '/profesional/perfil-negocio' },
  { label: 'Agenda', href: '/profesional/dashboard' },
  { label: 'Página pública', href: '/profesional/pagina-publica' },
  { label: 'Horarios de trabajo', href: '', disabled: true },
  { label: 'Servicios', href: '', disabled: true },
  { label: 'Reservas', href: '', disabled: true },
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
    <aside className="w-72 shrink-0 rounded-[26px] bg-[#0B1D2A] p-5 text-white shadow-[0_20px_60px_rgba(4,16,32,0.35)]">
      <div className="flex items-center gap-3 rounded-[18px] bg-white/10 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
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
      <p className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
        Navegación
      </p>
      <nav className="mt-3 space-y-2 text-sm font-semibold">
        {menuItems.map((item) => {
          const isActive = item.label === active;
          const className = `block w-full rounded-[16px] px-3 py-3 text-left transition ${
            isActive
              ? 'bg-white text-[#0B1D2A] shadow-md'
              : item.disabled
                ? 'cursor-not-allowed bg-white/5 text-white/40'
                : 'bg-white/10 text-white hover:bg-white/20'
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
      <div className="mt-6 rounded-[18px] bg-white/10 p-4 text-xs text-white/70">
        Tip: completá tu perfil para aparecer en las búsquedas destacadas.
      </div>
    </aside>
  );
}
