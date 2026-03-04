import { useMemo, useState } from 'react';
import type { Category } from '@/types/category';

type CategoryChipsProps = {
  categories: Category[];
  selectedSlug?: string;
  onSelect: (category: Category) => void;
  defaultVisible?: number;
};

export default function CategoryChips({
  categories,
  selectedSlug,
  onSelect,
  defaultVisible = 8,
}: CategoryChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleCategories = useMemo(() => {
    if (isExpanded || categories.length <= defaultVisible) return categories;
    return categories.slice(0, defaultVisible);
  }, [categories, defaultVisible, isExpanded]);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${isExpanded ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {visibleCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className={`truncate rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/25 ${
              selectedSlug === category.slug
                ? 'bg-[#1B6B5C] text-white'
                : 'border border-[#D5E4DC] bg-[#F6FBF8] text-[#1B6B5C] hover:bg-[#EDF7F2]'
            }`}
            title={category.name}
            aria-pressed={selectedSlug === category.slug}
          >
            {category.name}
          </button>
        ))}
      </div>

      {categories.length > defaultVisible ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center rounded-full border border-[#D3E2DB] bg-white px-3 py-1 text-xs font-semibold text-[#1B6B5C] transition hover:bg-[#F4FAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B5C]/25"
        >
          {isExpanded ? 'Ver menos' : `Ver mas (${categories.length - defaultVisible})`}
        </button>
      ) : null}
    </div>
  );
}
