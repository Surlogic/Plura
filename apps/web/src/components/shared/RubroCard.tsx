import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

type RubroCardProps = {
  title: string;
  slug: string;
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  showCta?: boolean;
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

export default memo(function RubroCard({
  title,
  slug,
  imageUrl,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  priority = false,
  showCta = false,
}: RubroCardProps) {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);

  return (
    <Link
      href={`/explorar/${encodeURIComponent(slug)}`}
      className={[
        'group block overflow-hidden rounded-[26px] border border-[color:var(--border-soft)] bg-white/95 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)]',
        className || '',
      ].join(' ')}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--surface-soft)] sm:aspect-[5/4] xl:aspect-[4/5]">
        {normalizedImageUrl ? (
          <Image
            src={normalizedImageUrl}
            alt={title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_62%,rgba(54,200,244,0.22)_100%)]"
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.18)_34%,rgba(15,23,42,0.54)_68%,rgba(15,23,42,0.9)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.12),transparent_34%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <h3
              className="max-w-[10.5rem] text-[1.02rem] font-semibold leading-[1.02] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.78)] sm:max-w-[11.5rem] sm:text-[1.16rem]"
              style={{ color: '#ffffff' }}
            >
              {title}
            </h3>
            {showCta ? (
              <span
                className="inline-flex shrink-0 rounded-full border border-white/16 bg-[rgba(255,255,255,0.14)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.52)] backdrop-blur-sm"
                style={{ color: '#ffffff' }}
              >
                Explorar
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
});
