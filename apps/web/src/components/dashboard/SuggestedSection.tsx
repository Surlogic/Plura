import ExploreCard from '@/components/explorar/ExploreCard';
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
  return (
    <section id="explorar-nuevos" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Descubrir
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Explorar nuevos
          </h2>
          <p className="text-sm text-[#6B7280]">
            Profesionales sugeridos según tus gustos.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver más
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
          {isLoading
            ? 'Cargando sugerencias...'
            : 'Todavía no tenemos sugerencias para vos.'}
        </div>
      ) : (
        <HorizontalScroller itemsCount={suggestions.length}>
          {suggestions.map((suggested) => (
            <div
              key={suggested.id}
              className="min-w-[240px] snap-start sm:min-w-[300px]"
            >
              <ExploreCard
                name={suggested.name}
                category={suggested.category}
                rating={suggested.rating}
                price={suggested.price}
                available={suggested.available}
                href={suggested.slug ? `/profesional/pagina/${encodeURIComponent(suggested.slug)}` : undefined}
              />
            </div>
          ))}
        </HorizontalScroller>
      )}
    </section>
  );
}
