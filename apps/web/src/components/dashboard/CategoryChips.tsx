import Link from 'next/link';

type CategoryChip = {
  id: string;
  label: string;
  query: string;
};

type CategoryChipsProps = {
  categories: CategoryChip[];
};

export default function CategoryChips({ categories }: CategoryChipsProps) {
  return (
    <section className="space-y-4">
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

      <div className="flex gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/explorar?categoria=${encodeURIComponent(category.query)}`}
            className="flex min-w-[140px] items-center justify-center rounded-full border border-[#E2E7EC] bg-white px-6 py-3 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:border-[#F59E0B] hover:shadow-md"
          >
            {category.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
