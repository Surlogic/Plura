export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export type Booking = {
  id: string;
  professional: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  canCancel?: boolean;
};

type BookingCardProps = {
  booking: Booking;
};

const statusStyles: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
  PENDING: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  CANCELLED: 'bg-[#EF4444]/10 text-[#EF4444]',
};

export default function BookingCard({ booking }: BookingCardProps) {
  return (
    <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
            Profesional
          </p>
          <h3 className="text-lg font-semibold text-[#0E2A47]">
            {booking.professional}
          </h3>
          <p className="text-sm text-[#6B7280]">{booking.service}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#475569]">
          <svg
            className="h-4 w-4 text-[#F59E0B]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm.75 4a.75.75 0 0 0-1.5 0v4.25c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V6z" />
          </svg>
          {booking.date} · {booking.time}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Ver detalle
        </button>
        {booking.canCancel ? (
          <button
            type="button"
            className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </article>
  );
}
