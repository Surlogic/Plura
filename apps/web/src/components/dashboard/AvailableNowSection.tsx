import MarketplaceCard from './MarketplaceCard';
import HorizontalScroller from './HorizontalScroller';

type AvailableNowItem = {
  id: string;
  slug?: string;
  name: string;
  category: string;
  rating?: string;
  price?: string;
  nextSlot?: string;
  location?: string;
};

type AvailableNowSectionProps = {
  items: AvailableNowItem[];
  isLoading?: boolean;
};

export default function AvailableNowSection({
  items,
  isLoading,
}: AvailableNowSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Disponible ahora
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Cerca tuyo
          </h2>
          <p className="text-sm text-[#6B7280]">
            Profesionales listos para reservar en el momento.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver más
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
          {isLoading
            ? 'Cargando profesionales disponibles...'
            : 'Todavía no hay profesionales disponibles.'}
        </div>
      ) : (
        <HorizontalScroller itemsCount={items.length}>
          {items.map((item) => (
            <div key={item.id} className="min-w-[260px] snap-start sm:min-w-[300px]">
              <MarketplaceCard
                name={item.name}
                category={item.category}
                rating={item.rating}
                price={item.price}
                nextSlot={item.nextSlot}
                location={item.location}
                href={item.slug ? `/profesional/pagina/${encodeURIComponent(item.slug)}` : undefined}
                badge={item.nextSlot ? 'Disponible ahora' : undefined}
                badgeTone="success"
              />
            </div>
          ))}
        </HorizontalScroller>
      )}
    </section>
  );
}
