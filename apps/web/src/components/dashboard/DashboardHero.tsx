import Link from 'next/link';
import { useState } from 'react';

type DashboardHeroProps = {
  name: string;
  location: string;
};

export default function DashboardHero({ name, location }: DashboardHeroProps) {
  const [availableNow, setAvailableNow] = useState(true);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">
            Hola, {name}
          </p>
          <h1 className="text-3xl font-semibold text-[#0E2A47] sm:text-4xl">
            Agendá tu próximo turno
          </h1>
          <p className="text-sm text-[#6B7280] sm:text-base">
            Buscá por servicio, ubicación y fecha para reservar en minutos.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E2E7EC] bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[2.2fr_1.6fr_1.2fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Servicio
              </label>
              <input
                className="h-12 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                placeholder="Corte, uñas, limpieza facial..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Ubicación
              </label>
              <input
                className="h-12 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                placeholder="Palermo, Recoleta, etc."
                defaultValue={location}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Fecha
              </label>
              <input
                type="date"
                className="h-12 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Disponible
              </label>
              <button
                type="button"
                onClick={() => setAvailableNow((prev) => !prev)}
                className={`flex h-12 w-full items-center justify-between rounded-full border px-4 text-sm font-semibold transition ${
                  availableNow
                    ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]'
                    : 'border-[#E2E7EC] bg-white text-[#6B7280]'
                }`}
                aria-pressed={availableNow}
              >
                Disponible ahora
                <span
                  className={`h-5 w-5 rounded-full transition ${
                    availableNow ? 'bg-[#F59E0B]' : 'bg-[#E2E7EC]'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/explorar"
                className="flex h-12 items-center justify-center rounded-full bg-[#F59E0B] px-6 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Buscar
              </Link>
              <Link
                href="/explorar"
                className="flex h-12 items-center justify-center rounded-full border border-[#E2E7EC] bg-white px-6 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Ver en mapa
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
