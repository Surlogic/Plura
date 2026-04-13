import { memo, useMemo } from 'react';
import type { Category } from '@/types/category';
import SearchBar from './SearchBar';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  categories: Category[];
  stats: HomeStats;
  isLoading?: boolean;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default memo(function Hero({ categories: _categories, stats, isLoading = false }: HeroProps) {
  const statItems = useMemo(
    () => [
      { label: 'Profesionales disponibles', value: isLoading ? '...' : formatStat(stats.professionals) },
      { label: 'Reservas mensuales', value: isLoading ? '...' : formatStat(stats.monthlyBookings) },
    ],
    [isLoading, stats.monthlyBookings, stats.professionals],
  );

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-18 xl:px-10 xl:pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute left-0 top-16 h-52 w-52 rounded-full bg-[color:var(--primary)]/7 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-56 w-56 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1140px]">
        <div className="mb-6 flex justify-center sm:mb-7 lg:mb-8">
          <p className="w-fit bg-[linear-gradient(90deg,var(--brand-cyan)_0%,var(--primary)_100%)] bg-clip-text text-center text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-transparent sm:text-[0.9rem]">
            Marketplace de estética y cuidado personal
          </p>
        </div>

        <div className="mx-auto flex max-w-[64rem] flex-col items-center gap-7 text-center sm:gap-8 lg:gap-9">
          <div className="mx-auto flex w-full max-w-[46rem] flex-col items-center">
            <div className="flex w-full flex-col items-center space-y-2 text-center lg:space-y-3">
              <h1 className="mx-auto max-w-[12.6ch] text-center text-[2.45rem] font-semibold leading-[0.95] tracking-[-0.04em] text-[color:var(--ink)] sm:text-[3.05rem] lg:text-[3.7rem] xl:text-[4rem] 2xl:text-[4.2rem]">
                <span className="block sm:whitespace-nowrap">Reservá tu próximo turno</span>
                <span className="block">sin complicaciones.</span>
              </h1>

              <p className="mx-auto max-w-[34rem] text-center text-[0.98rem] leading-6 text-[color:var(--ink-muted)] sm:text-[1.04rem] sm:leading-7">
                Tu servicio ideal te está esperando…
              </p>
            </div>
          </div>

          <div className="w-full max-w-[64rem] pt-5 sm:pt-6 xl:pt-8">
            <SearchBar />
          </div>

          <div className="w-full max-w-[64rem]">
            <div className="mx-auto max-w-[35rem]">
              <div className="grid gap-5 border-t border-[color:var(--border-soft)]/80 pt-5 text-center sm:grid-cols-2 sm:gap-7 sm:pt-6">
                {statItems.map((item, index) => (
                  <div
                    key={item.label}
                    className={index > 0 ? 'sm:border-l sm:border-[color:var(--border-soft)]/70 sm:pl-7' : ''}
                  >
                    <p className="text-[1.35rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.55rem]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});