import SearchBar from './SearchBar';
import Badge from '@/components/ui/Badge';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  stats: HomeStats;
  isLoading?: boolean;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default function Hero({ stats, isLoading = false }: HeroProps) {
  const trustPoints = [
    'Profesionales verificados',
    'Disponibilidad actualizada',
    'Reserva online simple',
  ];
  const statItems = [
    { label: 'Reservas en el mes', value: isLoading ? '...' : formatStat(stats.monthlyBookings) },
    { label: 'Profesionales activos', value: isLoading ? '...' : formatStat(stats.professionals) },
    { label: 'Categorias disponibles', value: isLoading ? '...' : formatStat(stats.categories) },
  ];

  return (
    <section className="px-4 pb-16 pt-10 sm:pb-18 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-[50rem]">
          <div className="space-y-4 text-center">
            <Badge variant="neutral" className="border-[color:var(--accent-soft)] bg-[color:var(--surface-strong)] text-[color:var(--accent-strong)]">
              Marketplace de reservas
            </Badge>
            <div className="space-y-2.5">
              <h1 className="mx-auto max-w-[40rem] text-[2.2rem] font-bold leading-[1.02] text-[color:var(--ink)] sm:text-[2.6rem] lg:text-[2.95rem]">
                Encontra profesionales y reserva tu proximo turno
              </h1>
              <p className="mx-auto max-w-[33rem] text-[0.98rem] leading-6 text-[color:var(--ink-muted)] sm:text-base">
                Servicios con disponibilidad real, informacion clara y reserva online simple.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {trustPoints.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3.5 py-1.5 text-[0.84rem] font-medium text-[color:var(--ink-muted)] shadow-[var(--shadow-card)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-7 max-w-[64rem]">
          <SearchBar />
        </div>

        <div className="mx-auto mt-5 max-w-[58rem] border-t border-[color:var(--border-soft)] pt-4">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {statItems.map((item, index) => (
              <div
                key={item.label}
                className={`text-center sm:text-left ${index > 0 ? 'sm:border-l sm:border-[color:var(--border-soft)] sm:pl-6' : ''}`}
              >
                <p className="text-[1.45rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.7rem]">
                  {item.value}
                </p>
                <p className="mt-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
