import Image from 'next/image';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';
import type { ResolvedPublicBusinessMedia } from '@/utils/publicBusinessMedia';
import {
  buildPublicBusinessImageStyle,
  buildPublicBusinessLogoStyle,
} from '@/utils/publicBusinessMedia';

export type ExploreMapPopupCardItem = {
  slug?: string | null;
  name: string;
  secondaryName?: string | null;
  category: string;
  kindLabel: string;
  rating?: number | null;
  reviewsCount?: number | null;
  priceFrom?: number | null;
  locationText?: string | null;
  media: ResolvedPublicBusinessMedia;
};

const formatPriceFrom = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 'Precio a consultar';
  }
  return `Desde $${new Intl.NumberFormat('es-UY').format(Math.round(value))}`;
};

export const buildExploreReserveHref = (slug?: string | null) => {
  const trimmedSlug = slug?.trim();
  return trimmedSlug ? `/reservar?profesional=${encodeURIComponent(trimmedSlug)}` : null;
};

function ExploreMapPopupCard({ item }: { item: ExploreMapPopupCardItem }) {
  const bannerKey = useMemo(
    () => item.media.mainImageCandidates.map((candidate) => candidate.key).join('|'),
    [item.media.mainImageCandidates],
  );
  const [bannerIndex, setBannerIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setBannerIndex(0);
    setLogoFailed(false);
  }, [bannerKey, item.media.logo?.src]);

  const activeBanner = item.media.mainImageCandidates[bannerIndex] ?? null;
  const reserveHref = buildExploreReserveHref(item.slug);
  const showLogo = Boolean(item.media.logo?.src) && !logoFailed;
  const hasRating = typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating > 0;

  return (
    <article className="w-[264px] overflow-hidden rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-lift)]">
      <div className="relative h-24 overflow-hidden bg-[color:var(--surface-soft)]">
        {activeBanner ? (
          <Image
            src={activeBanner.src}
            alt={`Imagen de ${item.name}`}
            fill
            sizes="264px"
            className="object-cover"
            style={buildPublicBusinessImageStyle(activeBanner)}
            onError={() =>
              setBannerIndex((current) => Math.min(current + 1, item.media.mainImageCandidates.length))
            }
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#102033_0%,#17324E_52%,rgba(10,122,67,0.4)_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.58))]" />
        {!activeBanner ? (
          <div className="absolute inset-x-0 bottom-3 flex px-3">
            <span className="rounded-full border border-white/18 bg-white/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm">
              {item.media.initials}
            </span>
          </div>
        ) : null}
      </div>

      <div className="px-3.5 pb-3.5 pt-0">
        <div className="-mt-7 flex items-end gap-3">
          <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/90 bg-[color:var(--surface-strong)] text-sm font-semibold text-[color:var(--ink)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.5)]">
            {showLogo ? (
              <Image
                src={item.media.logo!.src}
                alt={`Logo de ${item.name}`}
                fill
                sizes="56px"
                className="object-cover"
                style={buildPublicBusinessLogoStyle(item.media.logo)}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              item.media.initials
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h3 className="truncate text-[0.98rem] font-semibold text-[color:var(--ink)]">{item.name}</h3>
            {item.secondaryName ? (
              <p className="truncate text-xs text-[color:var(--ink-muted)]">{item.secondaryName}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <p className="text-[0.72rem] font-medium text-[color:var(--ink-muted)]">
            {item.kindLabel}
            {item.category ? ` · ${item.category}` : ''}
          </p>
          {item.locationText ? (
            <p className="text-xs leading-4 text-[color:var(--ink-faint)]">{item.locationText}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full bg-[#FFF7E7] px-2 py-1 font-semibold text-[#8A5A00]">
              <span className="mr-1 text-[#E59C17]">★</span>
              {hasRating ? item.rating!.toFixed(1) : 'Sin reseñas'}
            </span>
            {item.reviewsCount && item.reviewsCount > 0 ? (
              <span className="text-[color:var(--ink-faint)]">({item.reviewsCount})</span>
            ) : null}
            <span className="font-semibold text-[color:var(--ink)]">{formatPriceFrom(item.priceFrom)}</span>
          </div>
        </div>

        {reserveHref ? (
          <Link
            href={reserveHref}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-[color:var(--primary)] bg-[color:var(--primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-strong)] hover:bg-[color:var(--primary-strong)] hover:text-[color:var(--accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]"
          >
            Reservar
          </Link>
        ) : (
          <span className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-sm font-semibold text-[color:var(--ink-faint)]">
            Reservar
          </span>
        )}
      </div>
    </article>
  );
}

export default memo(ExploreMapPopupCard);
