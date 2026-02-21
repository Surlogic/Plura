const filters = ['Buscador', 'Rubros', 'Cerca de mí', 'Disponible ahora'];

export default function QuickFilters() {
  return (
    <section className="px-4">
      <div className="mx-auto flex w-full max-w-6xl gap-3 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            className="flex-shrink-0 rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-sm text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}
