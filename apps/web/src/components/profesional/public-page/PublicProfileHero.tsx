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

type PublicHeroSocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'website';

export type PublicHeroScheduleItem = {
  label: string;
  ranges: string;
};

export type PublicHeroSocialLink = {
  href: string;
  label: string;
  platform: PublicHeroSocialPlatform;
};

type PublicProfileHeroProps = {
  address?: string;
  bannerMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string;
  category?: string;
  headline?: string;
  initials?: string;
  isCurrentFavorite: boolean;
  isPreview?: boolean;
  logoMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string;
  name: string;
  onToggleFavorite: () => void;
  onViewServices: () => void;
  photoUrls?: string[];
  rating?: number | null;
  reviewsCount?: number | null;
  scheduleSummary?: PublicHeroScheduleItem[];
  socialLinks?: PublicHeroSocialLink[];
  whatsappHref?: string;
};

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
    <path d="m12 3.7 2.3 4.7 5.2.8-3.7 3.7.9 5.2L12 15.7 7.3 18l.9-5.2-3.7-3.7 5.2-.8L12 3.7Z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <circle
      cx="12"
      cy="12"
      r="8.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M12 7.8v4.6l3 1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path
      d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2" fill="currentColor" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.2-1.2l-.4-.2-3 .8.8-2.9-.2-.4A8 8 0 1 1 12 20Zm4.2-6c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1-.6.7-.7.8-.3.1-.5 0a5.8 5.8 0 0 1-1.7-1.1 6.5 6.5 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.4a1.5 1.5 0 0 0 .2-.4.5.5 0 0 0 0-.5c0-.1-.5-1.1-.7-1.5s-.4-.3-.5-.3h-.4a.8.8 0 0 0-.6.3 2.4 2.4 0 0 0-.8 1.8 4 4 0 0 0 .9 2.2 9.1 9.1 0 0 0 3.4 3 11.3 11.3 0 0 0 1.1.4 2.7 2.7 0 0 0 1.2.1 2 2 0 0 0 1.3-.9 1.6 1.6 0 0 0 .1-.9c0-.1-.2-.2-.4-.3Z" />
  </svg>
);

const SocialIcon = ({ platform }: { platform: PublicHeroSocialPlatform }) => {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.75 6.5a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z" />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M13 22v-9h3l.5-3H13V8.3c0-.9.3-1.5 1.6-1.5H16V4.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4V10H7v3h2.9v9H13Z" />
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M15 3c.4 2 1.8 3.5 4 3.8v2.7c-1.6 0-3.1-.5-4.3-1.4v6.1a5.2 5.2 0 1 1-5.2-5.2c.4 0 .8 0 1.2.1v2.8a2.6 2.6 0 1 0 1.4 2.3V3H15Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.9 9h-3.1a15.4 15.4 0 0 0-1.2-5A8 8 0 0 1 19.9 11Zm-7.9 9a13.2 13.2 0 0 1-2-7 13.2 13.2 0 0 1 2-7 13.2 13.2 0 0 1 2 7 13.2 13.2 0 0 1-2 7Zm-2.6-.4A15.4 15.4 0 0 1 8.2 13H4.1a8 8 0 0 0 5.3 6.6ZM4.1 11h4.1a15.4 15.4 0 0 1 1.2-5A8 8 0 0 0 4.1 11Zm10.5 8.6a15.4 15.4 0 0 0 1.2-5h4.1a8 8 0 0 1-5.3 5Zm1.2-8.6a15.4 15.4 0 0 0-1.2-5 8 8 0 0 1 5.3 5Z" />
    </svg>
  );
};

export default function PublicProfileHero({
  address,
  bannerMedia,
  bannerUrl,
  category,
  headline,
  initials,
  isCurrentFavorite,
  isPreview = false,
  logoMedia,
  logoUrl,
  name,
  onToggleFavorite,
  onViewServices,
  photoUrls = [],
  rating,
  reviewsCount,
  scheduleSummary = [],
  socialLinks = [],
  whatsappHref,
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
  const primarySchedule = scheduleSummary[0] ?? null;

  return (
    <section className="overflow-hidden rounded-[28px] bg-[color:var(--surface)] shadow-[0_26px_90px_-70px_rgba(15,23,42,0.34)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
        <div className="order-2 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 lg:order-1 lg:px-10 xl:px-12">
          {category ? (
            <Badge variant="neutral" className="w-fit normal-case tracking-normal">
              {category}
            </Badge>
          ) : null}

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[color:var(--ink)] sm:text-5xl lg:text-[3.5rem]">
            {name}
          </h1>

          {headline ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--ink-muted)] sm:text-lg">
              {headline}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--ink-muted)]">
            <div className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--ink)]">
              <StarIcon />
              {hasRating && hasReviews ? (
                <span>
                  {rating.toFixed(1)} · {reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'}
                </span>
              ) : (
                <span>Sin reseñas públicas todavía</span>
              )}
            </div>

            {address ? (
              <div className="inline-flex min-w-0 items-center gap-1.5">
                <PinIcon />
                <span className="truncate">{address}</span>
              </div>
            ) : null}

            {primarySchedule ? (
              <div className="inline-flex items-center gap-1.5">
                <ClockIcon />
                <span>{primarySchedule.label} · {primarySchedule.ranges}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="primary" size="lg" onClick={onViewServices}>
              Reservar turno
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="lg"
              className="border border-[color:var(--border-soft)] bg-white"
              onClick={onViewServices}
            >
              Ver servicios
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-card)]"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            ) : null}

            {socialLinks.map((link) => (
              <a
                key={`${link.platform}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-card)]"
                aria-label={link.label}
                title={link.label}
              >
                <SocialIcon platform={link.platform} />
              </a>
            ))}

            {!isPreview ? (
              <FavoriteToggleButton
                isActive={isCurrentFavorite}
                onClick={onToggleFavorite}
                variant="pill"
                className="justify-center"
                activeLabel="Favoritos"
                inactiveLabel="Favoritos"
              />
            ) : null}
          </div>
        </div>

        <div className="relative order-1 min-h-[320px] overflow-hidden lg:order-2 lg:m-4 lg:min-h-[560px] lg:rounded-[24px]">
          {activeBanner ? (
            <Image
              src={activeBanner.src}
              alt={`Banner de ${name || 'profesional'}`}
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
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
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.24)_100%)]" />

          <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/60 bg-white/92 p-4 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.5)] backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[340px]">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white bg-[color:var(--surface-soft)] text-lg font-semibold text-[color:var(--ink)]">
                {showLogoImage ? (
                  <Image
                    src={media.logo!.src}
                    alt={`Logo de ${name || 'profesional'}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                    style={buildPublicBusinessLogoStyle(media.logo)}
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  fallbackInitials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[color:var(--ink)]">{name}</p>
                {category ? (
                  <p className="mt-1 truncate text-sm text-[color:var(--ink-muted)]">{category}</p>
                ) : null}
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--ink)]">
                  <StarIcon />
                  {hasRating && hasReviews
                    ? `${rating.toFixed(1)} · ${reviewsCount} ${reviewsCount === 1 ? 'reseña' : 'reseñas'}`
                    : 'Nuevo'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
