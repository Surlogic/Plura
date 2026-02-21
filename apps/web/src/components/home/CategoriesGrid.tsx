import CategoryCard from './CategoryCard';

const categories = [
  'Peluquería',
  'Barbería',
  'Uñas',
  'Salón de belleza',
  'Cosmetología',
  'Spa',
  'Maquillaje',
  'Depilación',
];

export default function CategoriesGrid() {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#0E2A47]">Rubros</h2>
          <span className="text-sm text-[#6B7280]">+80 categorías</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category} title={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
