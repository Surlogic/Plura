import SearchBar from './SearchBar';
import Badge from '@/components/ui/Badge';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  stats: HomeStats;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default function Hero({ stats }: HeroProps) {
  const trustPoints = [
    'Profesionales verificados',
    'Disponibilidad actualizada',
    'Reserva online simple',
  ];

  return (
    <section className="px-4 pb-18 pt-12 sm:pt-16 sm:pb-22">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-[42rem] space-y-5">
          <Badge variant="neutral" className="border-[color:var(--accent-soft)] bg-white/84 text-[color:var(--accent-strong)]">
            Marketplace de reservas
          </Badge>
          <div className="space-y-3">
            <h1 className="max-w-[36rem] text-[2.45rem] font-bold leading-[1.03] text-[color:var(--ink)] sm:text-[3rem] lg:text-[3.55rem]">
              Encontrá profesionales y reservá tu próximo turno
            </h1>
            <p className="max-w-[34rem] text-base leading-7 text-[color:var(--ink-muted)] sm:text-lg">
              Explorá servicios, compará opciones y reservá con información clara,
              disponibilidad real y una experiencia simple desde la búsqueda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {trustPoints.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--border-soft)] bg-white/80 px-3.5 py-1.5 text-sm font-medium text-[color:var(--ink-muted)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <SearchBar />
        </div>

        <div className="mt-8 border-t border-[color:var(--border-soft)] pt-5">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                Reservas
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
                {formatStat(stats.monthlyBookings)}
              </p>
            </div>
            <div className="sm:border-l sm:border-[color:var(--border-soft)] sm:pl-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                Profesionales
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
                {formatStat(stats.professionals)}
              </p>
            </div>
            <div className="sm:border-l sm:border-[color:var(--border-soft)] sm:pl-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                Categorías
              </p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
                {formatStat(stats.categories)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
