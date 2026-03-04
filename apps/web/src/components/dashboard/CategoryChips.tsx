import Link from 'next/link';
import type { Category } from '@/types/category';
import RubroCard from '@/components/shared/RubroCard';
import HorizontalScroller from './HorizontalScroller';

type CategoryChipsProps = {
  categories: Category[];
};

export default function CategoryChips({ categories }: CategoryChipsProps) {
  if (categories.length === 0) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Rubros</p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">Rubros populares</h2>
        </div>
        <div className="rounded-[20px] border border-dashed border-[#E2E7EC] bg-white px-4 py-6 text-sm text-[#64748B]">
          No hay rubros disponibles por ahora.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Rubros
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Rubros populares
          </h2>
          <p className="text-sm text-[#6B7280]">
            Elegí una categoría y descubrí tu próximo turno.
          </p>
        </div>
        <Link
          href="/explorar"
          className="rounded-full border border-[#DFE7EF] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:bg-[#F8FAFC]"
        >
          Ver todo
        </Link>
      </div>

      <HorizontalScroller itemsCount={categories.length} controlsClassName="pr-1">
        {categories.map((category) => (
          <RubroCard
            key={category.id}
            title={category.name}
            slug={category.slug}
            imageUrl={category.imageUrl}
            sizes="(max-width: 640px) 250px, 280px"
            className="min-w-[250px] max-w-[250px] rounded-[20px] border border-[#E2EAF1] sm:min-w-[280px] sm:max-w-[280px]"
          />
        ))}
      </HorizontalScroller>
    </section>
  );
}
