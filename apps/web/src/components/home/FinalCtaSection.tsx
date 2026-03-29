import { memo } from 'react';
import Button from '@/components/ui/Button';

export default memo(function FinalCtaSection() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_58%,var(--brand-navy-elevated)_100%)] px-6 py-8 text-[color:var(--text-on-dark)] shadow-[var(--shadow-lift)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/6 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-2 h-32 w-32 rounded-full bg-[color:var(--accent)]/12 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--text-on-dark-secondary)]">
                Empeza ahora
              </p>
              <h2 className="text-2xl font-semibold text-[color:var(--text-on-dark)] sm:text-[2rem]">
                Encontrá tu próximo turno o sumá tu negocio a Plura
              </h2>
              <p className="text-sm leading-6 text-[color:var(--text-on-dark-secondary)] sm:text-base">
                El home orienta. La exploración y el perfil hacen el resto.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/explorar" variant="primary" size="lg" className="min-w-[10.5rem]">
                Reservar ahora
              </Button>
              <Button href="/profesional/auth/login" variant="contrast" size="lg" className="min-w-[10.5rem]">
                Soy profesional
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
