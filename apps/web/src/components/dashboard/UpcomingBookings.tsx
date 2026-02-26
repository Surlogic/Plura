import BookingCard, { type Booking } from './BookingCard';

type UpcomingBookingsProps = {
  bookings: Booking[];
};

export default function UpcomingBookings({ bookings }: UpcomingBookingsProps) {
  return (
    <section id="proximas-reservas" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
            Agenda
          </p>
          <h2 className="text-xl font-semibold text-[#0E2A47]">
            Próximas Reservas
          </h2>
          <p className="text-sm text-[#6B7280]">
            {bookings.length} turnos confirmados y pendientes.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver todas
        </button>
      </div>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </section>
  );
}
