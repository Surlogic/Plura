import Image from 'next/image';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import type { ProfessionalMediaPresentation } from '@/types/professional';
import {
  buildPublicBusinessImageStyle,
  buildPublicBusinessLogoStyle,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';

type BusinessCardProps = {
  bannerMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string | null;
  name: string;
  category: string;
  fallbackPhotoUrl?: string | null;
  rating?: number | string | null;
  reviewsCount?: number | null;
  badge?: string;
  imageUrl?: string | null;
  logoMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string | null;
  priority?: boolean;
  href: string;
};

export default memo(function BusinessCard({
  bannerMedia,
  bannerUrl,
  name,
  category,
  fallbackPhotoUrl,
  rating,
  reviewsCount,
  badge,
  imageUrl,
  logoMedia,
  logoUrl,
  priority = false,
  href,
}: BusinessCardProps) {
  const displayRating = typeof rating === 'number' ? rating.toFixed(1) : rating?.trim();
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
    <article className="group rounded-[28px] border border-[color:var(--border-soft)] bg-white/96 p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)]">
      <div className="relative h-52 w-full overflow-hidden rounded-[22px] bg-[color:var(--surface-soft)]">
        <Link href={href} className="absolute inset-0 z-10" aria-label={`Ver perfil de ${name}`}>
          <span className="sr-only">Ver perfil de {name}</span>
        </Link>
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
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#0f172a_0%,#17304a_56%,rgba(16,185,129,0.34)_100%)]">
            <div className="flex h-full w-full items-end p-5">
              <div className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-white/72">
                  Perfil
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[0.08em] text-white">
                  {media.initials}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.46))]" />
        <div className="absolute bottom-4 left-4 z-20">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-white/85 bg-white text-base font-semibold text-[color:var(--ink)] shadow-[0_20px_36px_-28px_rgba(15,23,42,0.55)]">
            {showLogoImage ? (
              <Image
                src={media.logo!.src}
                alt={`Logo de ${name}`}
                fill
                sizes="64px"
                className="object-cover"
                style={buildPublicBusinessLogoStyle(media.logo)}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              media.initials
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <Link href={href} className="block text-lg font-semibold text-[color:var(--ink)] transition hover:text-[color:var(--accent-strong)]">
            {name}
          </Link>
          <p className="text-sm text-[color:var(--ink-muted)]">{category || 'Profesional'}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[color:var(--ink)]">
            {displayRating ? (
              <>
                <span className="text-[color:var(--accent)]">★</span>
                <span className="font-medium">{displayRating}</span>
                {reviewsCount != null && reviewsCount > 0 ? (
                  <span className="text-[color:var(--ink-muted)]">({reviewsCount})</span>
                ) : null}
              </>
            ) : (
              <span className="text-xs font-semibold text-[color:var(--ink-faint)]">Sin reseñas</span>
            )}
          </div>
          {badge ? (
            <span className="rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--surface-soft)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-strong)]">
              {badge}
            </span>
          ) : null}
        </div>

        <div className="pt-1">
          <Button href={href} variant="secondary" className="w-full">
            Reservar
          </Button>
        </div>
      </div>
    </article>
  );
});
