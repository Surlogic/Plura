import MarketplaceCard from './MarketplaceCard';

type FavoriteProfessional = {
  id: string;
  name: string;
  category: string;
  rating?: string;
  price?: string;
  location?: string;
  nextAvailable?: string;
};

type FavoritesSectionProps = {
  favorites: FavoriteProfessional[];
  isLoading?: boolean;
};

export default function FavoritesSection({
  favorites,
  isLoading,
}: FavoritesSectionProps) {
  return (
    <section id="favoritos" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Favoritos
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">Tus favoritos</h2>
          <p className="text-sm text-[#6B7280]">
            Volvé rápido a los locales que más te gustan.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver todos
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
          {isLoading
            ? 'Cargando favoritos...'
            : 'Todavía no marcaste profesionales como favoritos.'}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="min-w-[260px] sm:min-w-[300px]">
              <MarketplaceCard
                name={favorite.name}
                category={favorite.category}
                rating={favorite.rating}
                price={favorite.price}
                nextSlot={favorite.nextAvailable}
                location={favorite.location}
                badge="Favorito"
                badgeTone="primary"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
