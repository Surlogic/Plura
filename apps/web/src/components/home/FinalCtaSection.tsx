import { memo } from 'react';
import Button from '@/components/ui/Button';

export default memo(function FinalCtaSection() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,250,251,0.96))] px-6 py-8 text-[color:var(--ink)] shadow-[0_28px_70px_-48px_rgba(13,35,58,0.28)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.14),transparent_70%)]" />
          <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-[color:var(--primary)]/8 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-4 h-36 w-36 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[color:var(--premium)]/8 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--accent-strong)]">
                Empeza ahora
              </p>
              <h2 className="text-2xl font-semibold text-[color:var(--ink)] sm:text-[2rem]">
                Encontrá tu próximo turno o sumá tu negocio a Plura
              </h2>
              <p className="max-w-[34rem] text-sm leading-6 text-[color:var(--ink-muted)] sm:text-base">
                El home orienta. La exploración y el perfil hacen el resto.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/explorar" variant="primary" size="lg" className="min-w-[10.5rem]">
                Reservar ahora
              </Button>
              <Button href="/profesional/auth/register" variant="secondary" size="lg" className="min-w-[10.5rem] border-white/70 bg-white/88">
                Soy profesional
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
