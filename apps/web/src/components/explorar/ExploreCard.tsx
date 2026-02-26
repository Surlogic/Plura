import Link from 'next/link';

type ExploreCardProps = {
  name: string;
  category: string;
  rating?: string;
  price?: string;
  available?: boolean;
  href?: string;
};

export default function ExploreCard({
  name,
  category,
  rating,
  price,
  available,
  href,
}: ExploreCardProps) {
  const displayRating = rating?.trim();
  const displayPrice = price?.trim() || 'Precio a confirmar';

  const cardContent = (
    <>
      <div className="h-40 w-full rounded-[20px] bg-[#E9EEF2]" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
          <p className="text-sm text-[#6B7280]">{category}</p>
        </div>
        {available ? (
          <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1 text-xs font-semibold text-[#1FB6A6]">
            Disponible hoy
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        {displayRating ? (
          <div className="flex items-center gap-2 text-[#0E2A47]">
            <svg
              className="h-4 w-4 text-[#1FB6A6]"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 1.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 13.9l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 1.5z" />
            </svg>
            <span>{displayRating}</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-[#94A3B8]">
            Sin reseñas
          </span>
        )}
        <span className="text-[#6B7280]">{displayPrice}</span>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      {cardContent}
    </Link>
  );
}
