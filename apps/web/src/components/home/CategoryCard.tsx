import { memo } from 'react';
import RubroCard from '@/components/shared/RubroCard';

type CategoryCardProps = {
  title: string;
  imageUrl?: string | null;
  slug: string;
  priority?: boolean;
  professionalsCount?: number | null;
};

export default memo(function CategoryCard({
  title,
  imageUrl,
  slug,
  priority = false,
  professionalsCount,
}: CategoryCardProps) {
  return (
    <RubroCard
      title={title}
      imageUrl={imageUrl}
      slug={slug}
      priority={priority}
      professionalsCount={professionalsCount}
      showCta
      className="rounded-[30px]"
      sizes="(max-width: 768px) 50vw, 33vw"
    />
  );
});