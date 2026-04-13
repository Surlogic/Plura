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
  professionalsCount?: number | null;
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

const formatProfessionalsBadge = (professionalsCount?: number | null) => {
  if (typeof professionalsCount !== 'number' || !Number.isFinite(professionalsCount) || professionalsCount <= 0) {
    return null;
  }

  if (professionalsCount >= 1000) {
    const roundedThousands = Math.floor(professionalsCount / 100) / 10;
    const value = Number.isInteger(roundedThousands)
      ? String(Math.trunc(roundedThousands))
      : roundedThousands.toFixed(1).replace('.', ',');
    return `${value}k+ profesionales`;
  }

  return `${professionalsCount}+ profesionales`;
};

export default memo(function RubroCard({
  title,
  slug,
  imageUrl,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  priority = false,
  showCta = false,
  professionalsCount,
}: RubroCardProps) {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);
  const professionalsBadge = formatProfessionalsBadge(professionalsCount);

  return (
    <Link
      href={`/explorar/${encodeURIComponent(slug)}`}
      className={[
        'group block overflow-hidden rounded-[30px] border border-[color:var(--border-soft)]/70 bg-white/95 shadow-[0_24px_64px_-42px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--border-strong)]/80 hover:shadow-[0_34px_80px_-44px_rgba(15,23,42,0.42)]',
        className || '',
      ].join(' ')}
    >
      <div className="relative aspect-[4/5.15] overflow-hidden bg-[color:var(--surface-soft)] sm:aspect-[4/5] xl:aspect-[4/5.05]">
        {normalizedImageUrl ? (
          <Image
            src={normalizedImageUrl}
            alt={title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[linear-gradient(145deg,var(--brand-navy)_0%,var(--brand-navy-soft)_62%,rgba(54,200,244,0.22)_100%)]"
            aria-hidden="true"
          />
        )}

        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.16)_28%,rgba(15,23,42,0.38)_62%,rgba(15,23,42,0.82)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_24%)]"
          aria-hidden="true"
        />

        {professionalsBadge ? (
          <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
            <span className="inline-flex rounded-full border border-white/12 bg-[rgba(255,255,255,0.22)] px-3 py-1.5 text-[0.72rem] font-medium text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.52)] backdrop-blur-md">
              {professionalsBadge}
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="space-y-4">
            <h3
              className="max-w-[12rem] text-[1.85rem] font-medium leading-[1.02] tracking-[-0.03em] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.72)] sm:max-w-[13rem] sm:text-[1.95rem]"
              style={{ color: '#ffffff' }}
            >
              {title}
            </h3>

            {showCta ? (
              <span
                className="inline-flex items-center gap-2 text-[0.98rem] font-semibold text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.72)]"
                style={{ color: '#ffffff' }}
              >
                Explorar
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <path
                    d="M4 10h11M11 5l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
});