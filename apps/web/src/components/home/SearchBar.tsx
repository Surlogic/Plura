import Link from 'next/link';

export default function SearchBar() {
  return (
    <div className="w-full">
      <div className="flex flex-col overflow-hidden rounded-full border border-[#0E2A47]/10 bg-white shadow-sm sm:flex-row">
        <div className="group flex flex-1 items-center gap-3 px-5 py-4 transition hover:bg-[#F4F6F8]">
          <div className="h-10 w-10 rounded-full bg-[#F4F6F8] flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1FB6A6]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Servicio
            </span>
            <input
              className="w-full bg-transparent text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none"
              placeholder="Buscar servicios, rubros o profesionales"
            />
          </div>
        </div>

        <div className="hidden w-px bg-[#0E2A47]/10 sm:block" />

        <div className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#F4F6F8]">
          <div className="h-10 w-10 rounded-full bg-[#F4F6F8] flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1FB6A6]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Ubicación
            </span>
            <span className="text-sm text-[#0E2A47]">Cerca tuyo</span>
          </div>
        </div>

        <div className="hidden w-px bg-[#0E2A47]/10 sm:block" />

        <div className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#F4F6F8]">
          <div className="h-10 w-10 rounded-full bg-[#F4F6F8] flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1FB6A6]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
              Fecha
            </span>
            <span className="text-sm text-[#0E2A47]">Cuando querés</span>
          </div>
        </div>

        <div className="hidden w-px bg-[#0E2A47]/10 sm:block" />

        <div className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#F4F6F8] sm:pr-2">
          <div className="flex items-center gap-2 rounded-full bg-[#1FB6A6]/10 px-3 py-2 text-sm font-medium text-[#0E2A47]">
            Disponible ahora
          </div>
        </div>

        <div className="px-4 py-4 sm:py-2">
          <Link
            href="/explorar"
            className="flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] px-8 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:h-14 sm:w-auto sm:text-base"
          >
            Buscar
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-[#0E2A47]">
        {['Disponible ahora', 'Cerca tuyo', 'Uñas', 'Peluquería'].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#0E2A47]/10 bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {chip}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
