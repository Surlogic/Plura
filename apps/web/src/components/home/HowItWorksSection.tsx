import { memo } from 'react';
import SectionHeading from '@/components/ui/SectionHeading';

const STEPS = [
  {
    title: 'Buscar',
    description: 'Elegí servicio, zona y fecha en segundos.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Elegir',
    description: 'Compará perfiles y encontrá el indicado.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 8h7M6.5 11h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Reservar',
    description: 'Confirmá tu turno con disponibilidad real.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.5 3v3M13.5 3v3M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Disfrutar',
    description: 'Recibí la confirmación y llegá con todo claro.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M5.5 10.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
] as const;

export default memo(function HowItWorksSection() {
  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeading
          kicker="Como funciona"
          title="Reservar en Plura es simple"
          description="Un recorrido corto para encontrar, elegir y reservar sin vueltas."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--accent-strong)] shadow-[0_10px_24px_-18px_rgba(13,35,58,0.4)]">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                      {`0${index + 1}`}
                    </span>
                    <h3 className="text-base font-semibold text-[color:var(--ink)]">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--ink-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
