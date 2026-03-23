import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback } from 'react';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';

type ExploreCardProps = {
  id?: string;
  name: string;
  category: string;
  city?: string;
  distance?: number | null;
  rating?: string;
  reviewsCount?: number | null;
  price?: string;
  available?: boolean;
  imageUrl?: string | null;
  href?: string;
  isHighlighted?: boolean;
  priority?: boolean;
  onHoverStart?: (id?: string) => void;
  onHoverEnd?: (id?: string) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (id?: string) => void;
};

export default memo(function ExploreCard({
  id,
  name,
  category,
  city,
  distance,
  rating,
  reviewsCount,
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
  const handleMouseEnter = useCallback(() => onHoverStart?.(id), [onHoverStart, id]);
  const handleMouseLeave = useCallback(() => onHoverEnd?.(id), [onHoverEnd, id]);

  return (
    <article
      className={`group rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)] ${
        isHighlighted ? 'ring-2 ring-[color:var(--accent-soft)]' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-40 w-full overflow-hidden rounded-[20px] bg-[color:var(--surface-soft)]">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.5))]" />
        {onFavoriteToggle ? (
          <div className="absolute right-3 top-3 z-20">
            <FavoriteToggleButton
              isActive={isFavorite}
              onClick={() => onFavoriteToggle(id)}
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
            <Link href={href} className="text-lg font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent-strong)]">
              {name}
            </Link>
          ) : (
            <h3 className="text-lg font-semibold text-[color:var(--ink)]">{name}</h3>
          )}
          <p className="text-sm text-[color:var(--ink-muted)]">{category || 'Profesional'}</p>
          {displayCity || displayDistance ? (
            <p className="text-xs text-[color:var(--ink-faint)]">
              {[displayCity, displayDistance].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        {available ? (
          <span className="rounded-full border border-[color:var(--success-soft)] bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--success)]">
            Disponible ahora
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        {displayRating ? (
          <div className="flex items-center gap-2 text-[color:var(--ink)]">
            <svg
              className="h-4 w-4 text-[color:var(--accent)]"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 1.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 13.9l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 1.5z" />
            </svg>
            <span>{displayRating}</span>
            {reviewsCount != null && reviewsCount > 0 ? (
              <span className="text-[color:var(--ink-muted)]">({reviewsCount})</span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs font-semibold text-[color:var(--ink-faint)]">Sin reseñas</span>
        )}
        <span className="text-[color:var(--ink)]">{displayPrice}</span>
      </div>
      {href ? (
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]"
          >
            Ver perfil
          </Link>
        </div>
      ) : null}
    </article>
  );
});
