type MarketplaceCardProps = {
  name: string;
  category: string;
  rating?: string;
  price?: string;
  nextSlot?: string;
  location?: string;
  badge?: string;
  badgeTone?: 'primary' | 'success';
};

const badgeStyles: Record<NonNullable<MarketplaceCardProps['badgeTone']>, string> = {
  primary: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  success: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
};

export default function MarketplaceCard({
  name,
  category,
  rating,
  price,
  nextSlot,
  location,
  badge,
  badgeTone = 'primary',
}: MarketplaceCardProps) {
  const displayRating = rating?.trim();
  const displayPrice = price?.trim() || 'Precio a confirmar';
  const displayNextSlot = nextSlot?.trim() || 'Consultar disponibilidad';
  return (
    <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44 w-full overflow-hidden rounded-[20px] bg-[#E9EEF2]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_60%)]" />
        {badge ? (
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[badgeTone]}`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
            <p className="text-sm text-[#6B7280]">{category}</p>
            {location ? (
              <p className="text-xs text-[#94A3B8]">{location}</p>
            ) : null}
          </div>
          {displayRating ? (
            <div className="flex items-center gap-1 rounded-full bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-[#0E2A47]">
              <span className="text-[#F59E0B]">★</span>
              {displayRating}
            </div>
          ) : (
            <span className="text-xs font-semibold text-[#94A3B8]">
              Sin reseñas
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-[#0E2A47]">{displayPrice}</span>
          <span className="text-xs text-[#6B7280]">
            Próximo: {displayNextSlot}
          </span>
        </div>

        <button
          type="button"
          className="w-full rounded-full bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Reservar rápido
        </button>
      </div>
    </article>
  );
}
