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
    <section className="relative px-4 pb-4 pt-8 sm:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute left-0 top-16 h-52 w-52 rounded-full bg-[color:var(--primary)]/7 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-56 w-56 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,42rem)_24rem] lg:items-start lg:gap-x-10 lg:gap-y-6 xl:grid-cols-[minmax(0,43rem)_25rem]">
          <div className="order-1 mx-auto max-w-[38rem] text-center lg:mx-0 lg:max-w-none lg:text-left">
            <div className="space-y-3">
              <h1 className="text-[2.5rem] font-semibold leading-[0.94] text-[color:var(--ink)] sm:text-[3.15rem] lg:text-[3.85rem]">
                Reservá tu próximo turno sin complicaciones.
              </h1>
              <p className="mx-auto max-w-[31rem] text-[1rem] leading-6 text-[color:var(--ink-muted)] sm:text-[1.06rem] lg:mx-0">
                Tu servicio ideal te está esperando…
              </p>
            </div>
          </div>

          <div className="order-2 mx-auto w-full max-w-[22rem] sm:max-w-[24rem] lg:row-span-3 lg:col-start-2 lg:mx-0 lg:justify-self-end">
            <HomeHeroVisual categories={categories} />
          </div>

          <div className="order-3 mx-auto mt-1 w-full max-w-[41.5rem] lg:col-start-1 lg:mx-0 lg:mt-0">
            <SearchBar />
          </div>

          <div className="order-4 mx-auto w-full max-w-[34rem] lg:col-start-1 lg:mx-0">
            <div className="grid gap-5 border-t border-[color:var(--border-soft)]/80 pt-4 text-center sm:grid-cols-2 sm:gap-8">
              {statItems.map((item, index) => (
                <div
                  key={item.label}
                  className={index > 0 ? 'sm:border-l sm:border-[color:var(--border-soft)]/70 sm:pl-8' : ''}
                >
                  <p className="text-[1.25rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.42rem]">
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
      </div>
    </section>
  );
});
