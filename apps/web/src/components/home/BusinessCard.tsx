import Image from 'next/image';
import { memo } from 'react';
import Badge from '@/components/ui/Badge';

type BusinessCardProps = {
  name: string;
  category: string;
  rating?: number | string | null;
  badge?: string;
  imageUrl?: string | null;
  priority?: boolean;
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
  badge,
  imageUrl,
  priority = false,
}: BusinessCardProps) {
  const displayRating = typeof rating === 'number' ? rating.toFixed(1) : rating?.trim();
  const safeImageUrl = normalizeImageUrl(imageUrl);
  return (
    <div className="group rounded-[28px] border border-[color:var(--border-soft)] bg-white/95 p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)]">
      <div className="relative h-44 w-full overflow-hidden rounded-[22px] bg-[color:var(--surface-soft)]">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.22))]" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--ink)]">{name}</h3>
          <p className="text-sm text-[color:var(--ink-muted)]">{category}</p>
        </div>
        {badge ? (
          <Badge variant="accent" className="tracking-[0.12em]">{badge}</Badge>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--ink)]">
        {displayRating ? (
          <>
            <span className="text-[color:var(--accent)]">★</span>
            <span>{displayRating}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-[color:var(--ink-faint)]">
            Sin reseñas
          </span>
        )}
      </div>
    </div>
  );
});
