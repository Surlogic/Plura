import { memo, useMemo } from 'react';
import type { Category } from '@/types/category';
import SearchBar from './SearchBar';
import HomeHeroVisual from './HomeHeroVisual';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  categories: Category[];
  stats: HomeStats;
  isLoading?: boolean;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default memo(function Hero({ categories, stats, isLoading = false }: HeroProps) {
  const statItems = useMemo(() => [
    { label: 'Profesionales disponibles', value: isLoading ? '...' : formatStat(stats.professionals) },
    { label: 'Reservas mensuales', value: isLoading ? '...' : formatStat(stats.monthlyBookings) },
  ], [isLoading, stats.monthlyBookings, stats.professionals]);

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:pb-16 sm:pt-10 lg:pb-20 xl:pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute left-0 top-16 h-52 w-52 rounded-full bg-[color:var(--primary)]/7 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-56 w-56 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,44rem)_minmax(22rem,25rem)] lg:items-start xl:grid-cols-[minmax(0,46rem)_26rem]">
          <div className="order-1 flex min-w-0 flex-col gap-8 sm:gap-10 lg:gap-12">
            <div className="mx-auto max-w-[39rem] text-center lg:mx-0 lg:max-w-none lg:text-left">
              <div className="space-y-4">
                <h1 className="text-[2.6rem] font-semibold leading-[0.94] text-[color:var(--ink)] sm:text-[3.2rem] lg:max-w-[13ch] lg:text-[4rem] xl:text-[4.2rem]">
                  Reservá tu próximo turno sin complicaciones.
                </h1>
                <p className="mx-auto max-w-[32rem] text-[1rem] leading-6 text-[color:var(--ink-muted)] sm:text-[1.08rem] lg:mx-0 lg:max-w-[33rem]">
                  Tu servicio ideal te está esperando…
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[46rem] lg:mx-0">
              <SearchBar />
            </div>

            <div className="mx-auto w-full max-w-[36rem] lg:mx-0">
              <div className="grid gap-6 border-t border-[color:var(--border-soft)]/80 pt-6 text-center sm:grid-cols-2 sm:gap-10 sm:pt-7 lg:pt-8">
                {statItems.map((item, index) => (
                  <div
                    key={item.label}
                    className={index > 0 ? 'sm:border-l sm:border-[color:var(--border-soft)]/70 sm:pl-10' : ''}
                  >
                    <p className="text-[1.4rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.65rem]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-2 mx-auto w-full max-w-[22rem] sm:max-w-[24rem] lg:mx-0 lg:mt-2 lg:max-w-none lg:justify-self-end">
            <HomeHeroVisual categories={categories} />
          </div>
        </div>
      </div>
    </section>
  );
});
