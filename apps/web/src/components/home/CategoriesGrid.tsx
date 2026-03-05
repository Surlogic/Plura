import { useState } from 'react';
import CategoryCard from './CategoryCard';
import type { Category } from '@/types/category';

type CategoriesGridProps = {
  categories: Category[];
};

export default function CategoriesGrid({ categories }: CategoriesGridProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleCategories = showAll ? categories : categories.slice(0, 8);
  const canToggle = categories.length > 8;

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#0E2A47]">Rubros</h2>
          <span className="text-sm text-[#6B7280]">
            {categories.length > 0 ? `${categories.length} categorías` : 'Sin categorías'}
          </span>
        </div>
        {visibleCategories.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {visibleCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  title={category.name}
                  slug={category.slug}
                  imageUrl={category.imageUrl}
                />
              ))}
            </div>
            {canToggle ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="rounded-full border border-[#DFE7EF] bg-white px-5 py-2 text-sm font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
                >
                  {showAll ? 'Ver menos' : 'Ver todas las categorías'}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
            No hay rubros para mostrar por ahora.
          </div>
        )}
      </div>
    </section>
  );
}
