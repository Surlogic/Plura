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
        'group block overflow-hidden rounded-[24px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md',
        className || '',
      ].join(' ')}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#E2E8F0]">
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
            className="absolute inset-0 bg-gradient-to-br from-[#C9D8E8] via-[#DDE8F2] to-[#EDF3F8]"
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
      </div>
    </Link>
  );
}
