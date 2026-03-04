import Link from 'next/link';
import HorizontalScroller from './HorizontalScroller';

type SuggestedProfessional = {
  id: string;
  slug?: string;
  name: string;
  category: string;
  rating?: string;
  price?: string;
  available?: boolean;
};

type SuggestedSectionProps = {
  suggestions: SuggestedProfessional[];
  isLoading?: boolean;
};

export default function SuggestedSection({
  suggestions,
  isLoading,
}: SuggestedSectionProps) {
  const getAccent = (category: string) => {
    const value = category.toLowerCase();
    if (value.includes('pelu')) return 'from-[#0EA5A4] to-[#155E75]';
    if (value.includes('barb')) return 'from-[#334155] to-[#0F172A]';
    if (value.includes('spa')) return 'from-[#14B8A6] to-[#0F766E]';
    if (value.includes('cosme') || value.includes('facial')) return 'from-[#F59E0B] to-[#B45309]';
    return 'from-[#1F3C88] to-[#0E2A47]';
  };

  return (
    <section id="profesionales" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Profesionales
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Recomendados para vos
          </h2>
          <p className="text-sm text-[#6B7280]">
            Perfiles activos para reservar ahora.
          </p>
        </div>
        <Link
          href="/explorar"
          className="rounded-full border border-[#DFE7EF] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
        >
          Ver todos
        </Link>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#E2E7EC] bg-white px-5 py-7 text-sm text-[#64748B]">
          {isLoading
            ? 'Cargando sugerencias...'
            : 'Todavía no tenemos sugerencias para vos.'}
        </div>
      ) : (
        <HorizontalScroller itemsCount={suggestions.length}>
          {suggestions.map((suggested) => (
            <article
              key={suggested.id}
              className="min-w-[280px] rounded-[24px] border border-[#DFE7EF] bg-white p-4 sm:min-w-[320px] sm:p-5"
            >
              <div className={`h-36 rounded-[18px] bg-gradient-to-br ${getAccent(suggested.category)} p-4 text-white`}>
                <p className="text-xs uppercase tracking-[0.18em] text-white/80">
                  Profesional
                </p>
                <p className="mt-3 text-lg font-semibold leading-tight">
                  {suggested.name}
                </p>
                <p className="mt-1 text-sm text-white/85">{suggested.category}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-[#64748B]">
                  {suggested.available ? 'Disponible hoy' : 'Agenda abierta'}
                </div>
                {suggested.slug ? (
                  <Link
                    href={`/profesional/pagina/${encodeURIComponent(suggested.slug)}`}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#DFE7EF] bg-white px-4 text-xs font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
                  >
                    Ver perfil
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center justify-center rounded-full border border-[#DFE7EF] bg-[#F8FAFC] px-4 text-xs font-semibold text-[#475569]">
                    Próximamente
                  </span>
                )}
              </div>
            </article>
          ))}
        </HorizontalScroller>
      )}
    </section>
  );
}
