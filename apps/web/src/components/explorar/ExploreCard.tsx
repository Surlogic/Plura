import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';

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
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
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
  isFavorite = false,
  onFavoriteToggle,
}: ExploreCardProps) {
  const displayRating = rating?.trim();
  const displayPrice = price?.trim() || 'Ver perfil';
  const displayCity = city?.trim();
  const displayDistance = typeof distance === 'number' ? `${distance.toFixed(1)} km` : '';

  return (
    <article
      className={`group rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isHighlighted ? 'ring-2 ring-[#0E2A47]/20' : ''
      }`}
      onMouseEnter={() => onHoverStart?.(id)}
      onMouseLeave={() => onHoverEnd?.(id)}
    >
      <div className="relative h-40 w-full overflow-hidden rounded-[20px] bg-[#E9EEF2]">
        {href ? (
          <Link href={href} className="absolute inset-0 z-10" aria-label={`Ver perfil de ${name}`}>
            <span className="sr-only">Ver perfil de {name}</span>
          </Link>
        ) : null}
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
        {onFavoriteToggle ? (
          <div className="absolute right-3 top-3 z-20">
            <FavoriteToggleButton
              isActive={isFavorite}
              onClick={onFavoriteToggle}
              tone="light"
              activeLabel={`Quitar a ${name} de favoritos`}
              inactiveLabel={`Guardar a ${name} en favoritos`}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          {href ? (
            <Link href={href} className="text-lg font-semibold text-[#0E2A47] hover:underline">
              {name}
            </Link>
          ) : (
            <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
          )}
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
      {href ? (
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex rounded-full border border-[#DFE7EF] bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:bg-white"
          >
            Ver perfil
          </Link>
        </div>
      ) : null}
    </article>
  );
});
