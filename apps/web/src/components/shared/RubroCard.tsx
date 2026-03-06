import Image from 'next/image';
import Link from 'next/link';

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

export default function RubroCard({
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
            className="absolute inset-0 bg-[linear-gradient(140deg,rgba(31,182,166,0.24),rgba(255,255,255,0.65),rgba(242,140,56,0.2))]"
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(13,35,58,0.7))]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
      </div>
    </Link>
  );
}
