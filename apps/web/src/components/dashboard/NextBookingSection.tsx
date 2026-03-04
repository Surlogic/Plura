type NextBooking = {
  id: string;
  professional: string;
  service: string;
  date: string;
  time: string;
  location: string;
  status: 'CONFIRMED' | 'PENDING';
};

type NextBookingSectionProps = {
  booking?: NextBooking | null;
};

const statusStyles: Record<NextBooking['status'], string> = {
  CONFIRMED: 'bg-[#E9FBF8] text-[#0F766E]',
  PENDING: 'bg-[#FFF7E7] text-[#B45309]',
};
const statusLabels: Record<NextBooking['status'], string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
};

export default function NextBookingSection({ booking }: NextBookingSectionProps) {
  return (
    <section id="proxima-reserva" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Próxima reserva
          </p>
          <h2 className="text-2xl font-semibold text-[#0E2A47]">
            Tu próxima cita
          </h2>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver todas
        </button>
      </div>

      {!booking ? (
        <div className="rounded-[26px] border border-dashed border-[#DFE7EF] bg-white px-5 py-8 text-sm text-[#64748B]">
          Todavía no tenés reservas próximas.
        </div>
      ) : (
        <article className="rounded-[28px] border border-[#DEE6EE] bg-white p-6 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[210px_1fr_auto] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                Fecha
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#0E2A47] sm:text-[2rem]">
                {booking.date}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#334155]">
                {booking.time} hs
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-semibold leading-tight text-[#0E2A47]">
                {booking.professional}
              </h3>
              <p className="text-sm font-medium text-[#475569]">{booking.service}</p>
              <p className="text-sm text-[#64748B]">{booking.location}</p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}
              >
                {statusLabels[booking.status]}
              </span>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#F59E0B] px-5 text-sm font-semibold text-white transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/40"
              >
                Ver detalle
              </button>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
