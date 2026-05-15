import { memo } from 'react';
import SectionHeading from '@/components/ui/SectionHeading';

const STEPS = [
  {
    stepLabel: 'Paso 1',
    title: 'Buscar',
    description: 'Explorá servicios, zonas y disponibilidad sin perder tiempo.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" strokeWidth="1.9" />
        <path d="M15 15l4.25 4.25" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    stepLabel: 'Paso 2',
    title: 'Elegir',
    description: 'Compará perfiles, reseñas y detalles hasta encontrar el indicado.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="4" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    stepLabel: 'Paso 3',
    title: 'Reservar',
    description: 'Elegí horario y confirmá tu turno con disponibilidad real.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14" rx="3.25" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 3.5v4M16 3.5v4M4 9.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    stepLabel: 'Paso 4',
    title: 'Disfrutar',
    description: 'Recibí la confirmación y llegá a tu turno con todo claro.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M7.5 12.5l3 3 6-7" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
] as const;

export default memo(function HowItWorksSection() {
  return (
    <section className="px-4">
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[34px] border border-[color:var(--border-soft)]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,250,251,0.98))] px-6 py-10 shadow-[var(--shadow-card)] sm:px-8 sm:py-12 lg:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(54,200,244,0.12),transparent_68%)]" />
        <div className="pointer-events-none absolute -left-10 top-20 h-32 w-32 rounded-full bg-[color:var(--primary)]/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 top-10 h-36 w-36 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />

        <div className="relative">
          <SectionHeading
            align="center"
            title="Cómo funciona"
            description="Reservar en Plura es simple."
            className="mx-auto"
          />

          <div className="relative mt-10">
            <div className="pointer-events-none absolute bottom-4 left-8 top-4 w-px bg-[linear-gradient(180deg,rgba(10,122,67,0.14),rgba(54,200,244,0.42),rgba(10,122,67,0.14))] lg:hidden" />
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-[3.65rem] hidden h-px bg-[linear-gradient(90deg,rgba(10,122,67,0.12),rgba(54,200,244,0.48),rgba(10,122,67,0.12))] lg:block" />

            <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step) => (
                <article
                  key={step.title}
                  className="relative grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 lg:block lg:px-2 lg:text-center"
                >
                  <div className="relative flex flex-col items-center">
                    <span className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      {step.stepLabel}
                    </span>
                    <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/75 bg-[color:var(--primary)] text-white shadow-[0_22px_44px_-26px_rgba(10,122,67,0.55)] ring-8 ring-[color:var(--surface-strong)]/90">
                      {step.icon}
                    </div>
                  </div>

                  <div className="min-w-0 pt-1 lg:pt-5">
                    <h3 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[17rem] text-sm leading-6 text-[color:var(--ink-muted)] lg:mx-auto">
                      {step.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
