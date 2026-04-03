import { memo, useState } from 'react';
import CategoryCard from './CategoryCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import type { Category } from '@/types/category';

type CategoriesGridProps = {
  categories: Category[];
  isLoading?: boolean;
};

export default memo(function CategoriesGrid({ categories, isLoading = false }: CategoriesGridProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleCategories = showAll ? categories : categories.slice(0, 8);
  const canToggle = categories.length > 8;

  return (
    <section className="px-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeading
          title="Explorá por categoría"
          description="Entrá por el tipo de servicio y seguí explorando con más detalle desde la siguiente pantalla."
        />
        {isLoading ? (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            Cargando rubros...
          </Card>
        ) : visibleCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {visibleCategories.map((category, index) => (
              <CategoryCard
                key={category.id}
                title={category.name}
                slug={category.slug}
                imageUrl={category.imageUrl}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <Card tone="soft" className="border-dashed text-sm text-[color:var(--ink-muted)]">
            No hay rubros para mostrar por ahora.
          </Card>
        )}
        {canToggle ? (
          <div className="flex justify-end">
            <Button type="button" onClick={() => setShowAll((prev) => !prev)} variant="quiet">
              {showAll ? 'Ver menos' : 'Ver todas'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
});
