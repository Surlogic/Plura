import Button from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { DashboardSectionHeading } from '@/components/profesional/dashboard/DashboardUI';
import type { ProfessionalProfile } from '@/types/professional';

type ProfessionalAccountAccessPanelProps = {
  profile?: ProfessionalProfile | null;
  isLoggingOut: boolean;
  onLogout: () => void;
  className?: string;
};

export default function ProfessionalAccountAccessPanel({
  profile,
  isLoggingOut,
  onLogout,
  className,
}: ProfessionalAccountAccessPanelProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <DashboardSectionHeading
        title="Acceso"
        description="Datos base del profesional y referencias de identidad pública."
      />
      <div className="mt-4 grid gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Email
          </p>
          <p className="mt-1 text-base font-semibold text-[color:var(--ink)]">
            {profile?.email || 'No disponible'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Slug público
          </p>
          <p className="mt-1 text-base font-semibold text-[color:var(--ink)]">
            {profile?.slug || 'No disponible'}
          </p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">
            Sesión actual
          </p>
          <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
            Cerrá sesión desde acá si querés salir del dashboard profesional.
          </p>
          <Button
            type="button"
            size="md"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-4"
          >
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
