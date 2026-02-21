export default function ExploreFilters() {
  return (
    <div className="rounded-[24px] border border-[#0E2A47]/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-[#0E2A47]/10">
        <div className="flex-1 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Buscador</p>
          <input
            className="mt-1 w-full bg-transparent text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none"
            placeholder="Buscar servicios, rubros o profesionales"
          />
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Categoría</p>
          <select className="mt-1 w-full bg-transparent text-sm text-[#0E2A47] focus:outline-none">
            <option>Todos los rubros</option>
            <option>Peluquería</option>
            <option>Barbería</option>
            <option>Uñas</option>
            <option>Cosmetología</option>
          </select>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Disponibilidad</p>
          <button className="mt-1 rounded-full bg-[#1FB6A6]/10 px-4 py-2 text-sm font-medium text-[#0E2A47] transition hover:bg-[#1FB6A6]/20">
            Disponible hoy
          </button>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Acciones</p>
          <button className="mt-1 rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 text-sm font-medium text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md">
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
