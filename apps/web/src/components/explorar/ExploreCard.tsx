import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

type ExploreCardProps = {
  id?: string;
  name: string;
  category: string;
  city?: string;
  distance?: number | null;
  rating?: string;
  price?: string;
  available?: boolean;
  imageUrl?: string | null;
  href?: string;
  isHighlighted?: boolean;
  priority?: boolean;
  onHoverStart?: (id?: string) => void;
  onHoverEnd?: (id?: string) => void;
};

export default memo(function ExploreCard({
  id,
  name,
  category,
  city,
  distance,
  rating,
  price,
  available,
  imageUrl,
  href,
  isHighlighted = false,
  priority = false,
  onHoverStart,
  onHoverEnd,
}: ExploreCardProps) {
  const displayRating = rating?.trim();
  const displayPrice = price?.trim() || 'Ver perfil';
  const displayCity = city?.trim();
  const displayDistance = typeof distance === 'number' ? `${distance.toFixed(1)} km` : '';

  const cardContent = (
    <>
      <div className="relative h-40 w-full overflow-hidden rounded-[20px] bg-[#E9EEF2]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E2A47]/45 via-transparent to-transparent" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
          <p className="text-sm text-[#6B7280]">{category || 'Profesional'}</p>
          {displayCity || displayDistance ? (
            <p className="text-xs text-[#94A3B8]">
              {[displayCity, displayDistance].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        {available ? (
          <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1 text-xs font-semibold text-[#1FB6A6]">
            Disponible ahora
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
          <span className="text-xs font-semibold text-[#94A3B8]">Sin reseñas</span>
        )}
        <span className="text-[#000000]">{displayPrice}</span>
      </div>
    </>
  );

  if (!href) {
    return (
      <div
        className={`group rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
          isHighlighted ? 'ring-2 ring-[#0E2A47]/20' : ''
        }`}
        onMouseEnter={() => onHoverStart?.(id)}
        onMouseLeave={() => onHoverEnd?.(id)}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group block rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isHighlighted ? 'ring-2 ring-[#0E2A47]/20' : ''
      }`}
      onMouseEnter={() => onHoverStart?.(id)}
      onMouseLeave={() => onHoverEnd?.(id)}
    >
      {cardContent}
    </Link>
  );
});
