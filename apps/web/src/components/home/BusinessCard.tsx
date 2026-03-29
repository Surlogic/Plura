import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import Button from '@/components/ui/Button';

type BusinessCardProps = {
  name: string;
  category: string;
  rating?: number | string | null;
  reviewsCount?: number | null;
  badge?: string;
  imageUrl?: string | null;
  priority?: boolean;
  href: string;
};

const normalizeImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
};

export default memo(function BusinessCard({
  name,
  category,
  rating,
  reviewsCount,
  badge,
  imageUrl,
  priority = false,
  href,
}: BusinessCardProps) {
  const displayRating = typeof rating === 'number' ? rating.toFixed(1) : rating?.trim();
  const safeImageUrl = normalizeImageUrl(imageUrl);
  return (
    <article className="group rounded-[28px] border border-[color:var(--border-soft)] bg-white/96 p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)]">
      <div className="relative h-52 w-full overflow-hidden rounded-[22px] bg-[color:var(--surface-soft)]">
        <Link href={href} className="absolute inset-0 z-10" aria-label={`Ver perfil de ${name}`}>
          <span className="sr-only">Ver perfil de {name}</span>
        </Link>
        {safeImageUrl ? (
          <Image
            src={safeImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_62%,rgba(54,200,244,0.18)_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.46))]" />
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
