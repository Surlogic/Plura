type DashboardHeaderProps = {
  name: string;
  subtitle?: string;
  memberSince?: string;
  upcomingCount?: number;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function DashboardHeader({
  name,
  subtitle,
  memberSince,
  upcomingCount,
}: DashboardHeaderProps) {
  return (
    <section
      id="dashboard-top"
      className="flex flex-col gap-6 rounded-[28px] border border-[#E2E7EC] bg-white/80 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F59E0B,#F97316)] text-lg font-semibold text-white shadow-sm">
          {getInitials(name)}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-[#6B7280]">Bienvenida de nuevo</p>
          <h1 className="text-2xl font-semibold text-[#0E2A47]">
            Hola, {name}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[#6B7280]">{subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {typeof upcomingCount === 'number' ? (
              <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 font-semibold text-[#F59E0B]">
                {upcomingCount} próximas reservas
              </span>
            ) : null}
            {memberSince ? (
              <span className="rounded-full bg-[#0E2A47]/5 px-3 py-1 font-semibold text-[#475569]">
                Cliente desde {memberSince}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ir a perfil
        </button>
        <button
          type="button"
          className="rounded-full bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}
