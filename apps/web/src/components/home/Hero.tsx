import SearchBar from './SearchBar';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  stats: HomeStats;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default function Hero({ stats }: HeroProps) {
  return (
    <section className="flex min-h-[80vh] items-center justify-center overflow-visible px-4 pt-16 pb-28">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <div className="space-y-4">
          <h1 className="mx-auto max-w-[800px] text-4xl font-bold leading-tight text-[#0E2A47] sm:text-5xl lg:text-6xl">
            Encontrá tu próximo turno
          </h1>
          <p className="mx-auto max-w-[600px] text-base text-[#6B7280] sm:text-lg">
            Descubrí profesionales y espacios de bienestar con disponibilidad real y
            confirmación rápida.
          </p>
        </div>

        <SearchBar />

        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-2 sm:gap-12">
          <div className="space-y-2">
            <p className="text-3xl font-bold text-[#0E2A47] sm:text-4xl">
              {formatStat(stats.monthlyBookings)}
            </p>
            <p className="text-sm text-[#6B7280]">Reservas en el mes</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-[#0E2A47] sm:text-4xl">
              {formatStat(stats.professionals)}
            </p>
            <p className="text-sm text-[#6B7280]">Locales registrados</p>
          </div>
        </div>
      </div>
    </section>
  );
}
