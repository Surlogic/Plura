import Link from 'next/link';
import HorizontalScroller from './HorizontalScroller';

type CategoryChip = {
  id: string;
  label: string;
  query: string;
  image: string;
  accent: string;
};

type CategoryChipsProps = {
  categories: CategoryChip[];
};

export default function CategoryChips({ categories }: CategoryChipsProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Categorías
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Explorá por rubro
          </h2>
          <p className="text-sm text-[#6B7280]">
            Encontrá tu próximo turno por especialidad.
          </p>
        </div>
        <Link
          href="/explorar"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver todo
        </Link>
      </div>

      <HorizontalScroller itemsCount={categories.length} controlsClassName="pr-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/explorar?categoria=${encodeURIComponent(category.query)}`}
            className="group relative block h-[180px] min-w-[172px] overflow-hidden rounded-[22px] border border-[#E2E7EC] bg-[#E2E8F0] shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:min-w-[210px]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${category.image})` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, transparent 20%, ${category.accent} 100%)` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col items-center justify-end p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/85">
                Rubro
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{category.label}</p>
            </div>
          </Link>
        ))}
      </HorizontalScroller>
    </section>
  );
}
