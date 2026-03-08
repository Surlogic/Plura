import { useState } from 'react';
import CategoryCard from './CategoryCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import type { Category } from '@/types/category';

type CategoriesGridProps = {
  categories: Category[];
  isLoading?: boolean;
};

export default function CategoriesGrid({ categories, isLoading = false }: CategoriesGridProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleCategories = showAll ? categories : categories.slice(0, 8);
  const canToggle = categories.length > 8;

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeading
          kicker="Explorar"
          title="Rubros con una navegación más clara"
          description="Accedé más rápido a las categorías principales sin romper el lenguaje visual del resto del producto."
          action={(
            <span className="text-sm font-medium text-[color:var(--ink-muted)]">
              {categories.length > 0 ? `${categories.length} categorías` : 'Sin categorías'}
            </span>
          )}
        />
        {isLoading ? (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            Cargando rubros...
          </Card>
        ) : visibleCategories.length > 0 ? (
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
                <Button type="button" onClick={() => setShowAll((prev) => !prev)}>
                  {showAll ? 'Ver menos' : 'Ver todas las categorías'}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            No hay rubros para mostrar por ahora.
          </Card>
        )}
      </div>
    </section>
  );
}
