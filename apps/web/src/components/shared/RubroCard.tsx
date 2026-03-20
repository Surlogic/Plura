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
}: RubroCardProps) {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);

  return (
    <Link
      href={`/explorar/${encodeURIComponent(slug)}`}
      className={[
        'group block overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-white/95 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-lift)]',
        className || '',
      ].join(' ')}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[color:var(--surface-soft)]">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_42%,rgba(15,23,42,0.84)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(54,200,244,0.14),transparent_36%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="text-xl font-semibold text-[color:var(--text-on-dark)]">{title}</h3>
        </div>
      </div>
    </Link>
  );
});
