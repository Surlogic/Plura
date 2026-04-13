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
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:pb-16 sm:pt-10 lg:pb-[4.5rem] lg:pt-12 xl:pb-[5.5rem]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute left-0 top-16 h-52 w-52 rounded-full bg-[color:var(--primary)]/7 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-56 w-56 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[72rem]">
        <div className="grid gap-y-10 lg:grid-cols-[minmax(0,35.5rem)_minmax(19.5rem,21rem)] lg:items-start lg:gap-x-16 xl:grid-cols-[36.5rem_minmax(20.5rem,22rem)] xl:gap-x-20">
          <div className="order-1 flex min-w-0 flex-col items-center lg:items-start">
            <div className="w-full max-w-[35.5rem]">
              <div className="rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(239,247,247,0.96)_52%,rgba(232,244,246,0.92)_100%)] px-5 py-6 text-center shadow-[0_28px_80px_-58px_rgba(15,23,42,0.34)] sm:px-7 sm:py-7 lg:min-h-[15rem] lg:px-8 lg:py-7 lg:text-left xl:min-h-[15.75rem]">
                <div className="space-y-4">
                  <h1 className="text-[2.7rem] font-semibold leading-[0.9] tracking-[-0.05em] text-[color:var(--ink)] sm:text-[3.3rem] lg:max-w-[10.4ch] lg:text-[4.6rem] xl:text-[4.95rem]">
                    Reservá tu próximo turno sin complicaciones.
                  </h1>
                  <p className="mx-auto max-w-[30rem] text-[1rem] leading-6 text-[color:var(--ink-muted)] sm:text-[1.08rem] lg:mx-0 lg:max-w-[27rem]">
                    Tu servicio ideal te está esperando…
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 w-full max-w-[35.5rem] lg:mt-2">
              <SearchBar />
            </div>

            <div className="mt-5 w-full max-w-[18.25rem] self-center sm:max-w-[19rem] lg:mt-4">
              <div className="rounded-[1.65rem] border border-white/72 bg-white/72 px-6 py-5 shadow-[0_24px_54px_-46px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                <div className="grid gap-5 text-center sm:grid-cols-2 sm:gap-6">
                  {statItems.map((item, index) => (
                    <div
                      key={item.label}
                      className={index > 0 ? 'sm:border-l sm:border-[color:var(--border-soft)]/70 sm:pl-6' : ''}
                    >
                      <p className="text-[1.35rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.55rem]">
                        {item.value}
                      </p>
                      <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-2 mx-auto w-full max-w-[20.75rem] sm:max-w-[22rem] lg:mx-0 lg:justify-self-end xl:max-w-[21.75rem]">
            <HomeHeroVisual categories={categories} />
          </div>
        </div>
      </div>
    </section>
  );
});
