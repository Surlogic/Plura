import { memo, useMemo } from 'react';
import SearchBar from './SearchBar';
import type { HomeStats } from '@/types/home';

type HeroProps = {
  stats: HomeStats;
  isLoading?: boolean;
};

const formatStat = (value: number) => value.toLocaleString('es-UY');

export default memo(function Hero({ stats, isLoading = false }: HeroProps) {
  const statItems = useMemo(() => [
    { label: 'Profesionales activos', value: isLoading ? '...' : formatStat(stats.professionals) },
    { label: 'Categorias disponibles', value: isLoading ? '...' : formatStat(stats.categories) },
    { label: 'Reservas mensuales', value: isLoading ? '...' : formatStat(stats.monthlyBookings) },
  ], [isLoading, stats.monthlyBookings, stats.professionals, stats.categories]);

  return (
    <section className="px-4 pb-6 pt-8 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,251,0.92))] px-5 py-8 shadow-[0_28px_84px_-52px_rgba(13,35,58,0.3)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.12),transparent_72%)]" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[color:var(--accent)]/8 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-8 h-36 w-36 rounded-full bg-[color:var(--primary)]/8 blur-3xl" />

          <div className="relative mx-auto max-w-[49rem] text-center">
            <div className="space-y-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--accent-strong)]">
                Marketplace de belleza y bienestar
              </p>
              <div className="space-y-3">
                <h1 className="mx-auto max-w-[42rem] text-[2.35rem] font-semibold leading-[0.98] text-[color:var(--ink)] sm:text-[2.9rem] lg:text-[3.45rem]">
                  Reservá con profesionales de confianza, sin ruido
                </h1>
                <p className="mx-auto max-w-[36rem] text-[0.98rem] leading-6 text-[color:var(--ink-muted)] sm:text-[1.02rem]">
                  Buscá por servicio, ubicación y fecha para llegar más rápido a tu próximo turno.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-8 max-w-[68rem]">
            <SearchBar />
          </div>

          <div className="relative mx-auto mt-6 max-w-[52rem]">
            <div className="grid gap-3 sm:grid-cols-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-[color:var(--border-soft)] bg-white/78 px-4 py-4 text-center shadow-[0_18px_36px_-34px_rgba(13,35,58,0.32)] backdrop-blur"
                >
                  <p className="text-[1.35rem] font-semibold leading-none text-[color:var(--ink)] sm:text-[1.55rem]">
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
