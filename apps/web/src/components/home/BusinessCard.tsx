import Image from 'next/image';
import { memo } from 'react';

type BusinessCardProps = {
  name: string;
  category: string;
  rating?: number | string | null;
  badge?: string;
  imageUrl?: string | null;
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
}: BusinessCardProps) {
  const displayRating = typeof rating === 'number' ? rating.toFixed(1) : rating?.trim();
  const safeImageUrl = normalizeImageUrl(imageUrl);
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-40 w-full overflow-hidden rounded-[20px] bg-[#F4F6F8]">
        {safeImageUrl ? (
          <Image
            src={safeImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0E2A47]">{name}</h3>
          <p className="text-sm text-[#6B7280]">{category}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1 text-xs font-semibold text-[#1FB6A6]">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-[#0E2A47]">
        {displayRating ? (
          <>
            <span className="text-[#1FB6A6]">★</span>
            <span>{displayRating}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-[#94A3B8]">
            Sin reseñas
          </span>
        )}
      </div>
    </div>
  );
});
