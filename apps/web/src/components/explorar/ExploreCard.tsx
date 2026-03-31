import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import type { ProfessionalMediaPresentation } from '@/types/professional';
import {
  buildPublicBusinessImageStyle,
  buildPublicBusinessLogoStyle,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';

type ExploreCardProps = {
  bannerMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string | null;
  id?: string;
  name: string;
  category: string;
  city?: string;
  distance?: number | null;
  fallbackPhotoUrl?: string | null;
  rating?: string;
  reviewsCount?: number | null;
  price?: string;
  available?: boolean;
  imageUrl?: string | null;
  logoMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string | null;
  href?: string;
  isHighlighted?: boolean;
  priority?: boolean;
  onHoverStart?: (id?: string) => void;
  onHoverEnd?: (id?: string) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (id?: string) => void;
};

export default memo(function ExploreCard({
  bannerMedia,
  bannerUrl,
  id,
  name,
  category,
  city,
  distance,
  fallbackPhotoUrl,
  rating,
  reviewsCount,
  price,
  available,
  imageUrl,
  logoMedia,
  logoUrl,
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
  const media = useMemo(
    () =>
      resolvePublicBusinessMedia({
        bannerMedia,
        bannerUrl,
        fallbackPhotoUrl,
        imageUrl,
        logoMedia,
        logoUrl,
        name,
      }),
    [bannerMedia, bannerUrl, fallbackPhotoUrl, imageUrl, logoMedia, logoUrl, name],
  );
  const mediaKey = media.mainImageCandidates.map((candidate) => candidate.key).join('|');
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setMainImageIndex(0);
    setLogoFailed(false);
  }, [mediaKey, media.logo?.src]);

  const activeImage = media.mainImageCandidates[mainImageIndex] ?? null;
  const showLogoImage = Boolean(media.logo?.src) && !logoFailed;

  return (
    <article
      className={`group rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)] ${
        isHighlighted ? 'ring-2 ring-[color:var(--accent-soft)]' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-44 w-full overflow-hidden rounded-[20px] bg-[color:var(--surface-soft)]">
        {href ? (
          <Link href={href} className="absolute inset-0 z-10" aria-label={`Ver perfil de ${name}`}>
            <span className="sr-only">Ver perfil de {name}</span>
          </Link>
        ) : null}
        {activeImage ? (
          <Image
            src={activeImage.src}
            alt={`Imagen de ${name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
            style={buildPublicBusinessImageStyle(activeImage)}
            onError={() =>
              setMainImageIndex((current) => Math.min(current + 1, media.mainImageCandidates.length))
            }
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#102033_0%,#17324e_56%,rgba(56,189,150,0.28)_100%)]">
            <div className="flex h-full w-full items-end p-4">
              <div className="rounded-[20px] border border-white/18 bg-white/12 px-3.5 py-2.5 backdrop-blur-sm">
                <p className="text-[0.56rem] font-semibold uppercase tracking-[0.22em] text-white/72">
                  Marca
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-[0.08em] text-white">
                  {media.initials}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.5))]" />
        <div className="absolute bottom-3 left-3 z-20">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-white/85 bg-white text-sm font-semibold text-[color:var(--ink)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
            {showLogoImage ? (
              <Image
                src={media.logo!.src}
                alt={`Logo de ${name}`}
                fill
                sizes="56px"
                className="object-cover"
                style={buildPublicBusinessLogoStyle(media.logo)}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              media.initials
            )}
          </div>
        </div>
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
