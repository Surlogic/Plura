import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  buildPublicBusinessImageStyle,
  buildPublicBusinessLogoStyle,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';
import type { ProfessionalMediaPresentation } from '@/types/professional';

type PublicProfileHeroProps = {
  about?: string;
  bannerMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string;
  category?: string;
  headline?: string;
  initials?: string;
  isCurrentFavorite: boolean;
  isPreview?: boolean;
  locationLabel?: string;
  logoMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string;
  name: string;
  onReserve: () => void;
  onToggleFavorite: () => void;
  onViewServices: () => void;
  photoUrls?: string[];
  reserveLabel?: string;
  rating?: number | null;
  reviewsCount?: number | null;
  reserveDisabled?: boolean;
};

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path
      d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
    <path d="m12 3.7 2.3 4.7 5.2.8-3.7 3.7.9 5.2L12 15.7 7.3 18l.9-5.2-3.7-3.7 5.2-.8L12 3.7Z" />
  </svg>
);

export default function PublicProfileHero({
  about,
  bannerMedia,
  bannerUrl,
  category,
  headline,
  initials,
  isCurrentFavorite,
  isPreview = false,
  locationLabel,
  logoMedia,
  logoUrl,
  name,
  onReserve,
  onToggleFavorite,
  onViewServices,
  photoUrls = [],
  reserveLabel = 'Reservar',
  rating,
  reviewsCount,
  reserveDisabled = false,
}: PublicProfileHeroProps) {
  const media = useMemo(
    () =>
      resolvePublicBusinessMedia({
        bannerMedia,
        bannerUrl,
        logoMedia,
        logoUrl,
        name,
        photoUrls,
      }),
    [bannerMedia, bannerUrl, logoMedia, logoUrl, name, photoUrls],
  );
  const mediaKey = media.mainImageCandidates.map((candidate) => candidate.key).join('|');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setBannerIndex(0);
    setLogoFailed(false);
  }, [mediaKey, media.logo?.src]);

  const activeBanner = media.mainImageCandidates[bannerIndex] ?? null;
  const fallbackInitials = initials || media.initials || '?';
  const showLogoImage = Boolean(media.logo?.src) && !logoFailed;
  const hasRating = typeof rating === 'number' && Number.isFinite(rating);
  const hasReviews = typeof reviewsCount === 'number' && reviewsCount > 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface)]">
      <div className="relative h-[236px] sm:h-[300px] lg:h-[360px] xl:h-[400px]">
        {activeBanner ? (
          <Image
            src={activeBanner.src}
            alt={`Banner de ${name || 'profesional'}`}
            fill
            sizes="100vw"
            className="object-cover"
            style={buildPublicBusinessImageStyle(activeBanner)}
            priority={!isPreview}
            onError={() =>
              setBannerIndex((current) => Math.min(current + 1, media.mainImageCandidates.length))
            }
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(145deg,#0f172a_0%,#1d2d39_58%,rgba(10,122,67,0.62)_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.16)_0%,rgba(15,23,42,0.28)_38%,rgba(15,23,42,0.5)_100%)]" />
      </div>

      <div className="relative px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-7">
        <div className="-mt-14 rounded-[24px] bg-[color:var(--surface)]/95 p-5 backdrop-blur-sm sm:-mt-16 sm:p-6 lg:-mt-[4.5rem] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4 sm:gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border-4 border-white bg-[color:var(--surface-soft)] text-xl font-semibold text-[color:var(--ink)] sm:h-24 sm:w-24">
                {showLogoImage ? (
                  <Image
                    src={media.logo!.src}
                    alt={`Logo de ${name || 'profesional'}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    style={buildPublicBusinessLogoStyle(media.logo)}
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  fallbackInitials
                )}
              </div>

              <div className="min-w-0">
                {category ? (
                  <Badge variant="neutral" className="normal-case tracking-normal">
                    {category}
                  </Badge>
                ) : null}
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--ink)] sm:text-4xl lg:text-[3rem]">
                  {name}
                </h1>
                {headline ? (
                  <p className="mt-3 max-w-4xl text-base leading-7 text-[color:var(--ink-muted)] sm:text-lg">
                    {headline}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[color:var(--ink)]">
                    <StarIcon />
                    {hasRating && hasReviews ? (
                      <span className="font-medium">
                        {rating.toFixed(1)} · {reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'}
                      </span>
                    ) : (
                      <span className="font-medium">Sin reseñas publicas todavia</span>
                    )}
                  </div>

                  {locationLabel ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[color:var(--ink)]">
                      <LocationIcon />
                      <span className="font-medium">{locationLabel}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {!isPreview ? (
              <div className="flex w-full flex-col gap-2.5 lg:w-[240px] lg:shrink-0">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={onReserve}
                  disabled={reserveDisabled}
                >
                  {reserveLabel}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={onViewServices}
                >
                  Ver servicios
                </Button>
                <FavoriteToggleButton
                  isActive={isCurrentFavorite}
                  onClick={onToggleFavorite}
                  variant="pill"
                  className="w-full justify-center"
                  activeLabel="Guardado"
                  inactiveLabel="Guardar"
                />
              </div>
            ) : null}
          </div>

          {about ? (
            <div className="mt-5 border-t border-[color:var(--border-soft)] pt-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                Sobre el profesional
              </p>
              <p className="mt-3 max-w-5xl text-sm leading-7 text-[color:var(--ink-muted)] sm:text-base">
                {about}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
