import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';
import {
  getClientBookings,
  type ClientDashboardBooking,
} from '@/services/clientBookings';

const statusLabel: Record<ClientDashboardBooking['status'], string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
};

const statusStyles: Record<ClientDashboardBooking['status'], string> = {
  CONFIRMED: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
  PENDING: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  CANCELLED: 'bg-[#EF4444]/10 text-[#EF4444]',
  COMPLETED: 'bg-[#3B82F6]/10 text-[#3B82F6]',
};

const isUpcomingBooking = (booking: ClientDashboardBooking, now: Date): boolean => {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false;
  const bookingDate = new Date(booking.dateTime);
  if (Number.isNaN(bookingDate.getTime())) return false;
  return bookingDate > now;
};

const sortByDateAsc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();

const sortByDateDesc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();

type ReservationCardProps = {
  booking: ClientDashboardBooking;
  highlighted?: boolean;
};

function ReservationCard({ booking, highlighted = false }: ReservationCardProps) {
  return (
    <article
      className={`rounded-[20px] border p-4 shadow-sm ${
        highlighted
          ? 'border-[#F59E0B]/40 bg-[#FFFBEB]'
          : 'border-[#E2E7EC] bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0E2A47]">
          {booking.time} · {booking.service}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}
        >
          {statusLabel[booking.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-[#475569]">{booking.professional}</p>
      <p className="mt-1 text-xs text-[#64748B]">{booking.date}</p>
    </article>
  );
}

export default function ClienteReservasPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';
  const [bookings, setBookings] = useState<ClientDashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    getClientBookings()
      .then((response) => {
        if (isCancelled) return;
        setBookings(response);
      })
      .catch(() => {
        if (isCancelled) return;
        setBookings([]);
        setError('No pudimos cargar tus reservas en este momento.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => isUpcomingBooking(booking, now))
      .sort(sortByDateAsc);
  }, [bookings]);

  const nextBooking = useMemo(() => upcomingBookings[0] ?? null, [upcomingBookings]);

  const additionalUpcomingBookings = useMemo(
    () => upcomingBookings.slice(1),
    [upcomingBookings],
  );

  const pastBookings = useMemo(() => {
    const upcomingIds = new Set(upcomingBookings.map((booking) => booking.id));
    return bookings
      .filter((booking) => !upcomingIds.has(booking.id))
      .sort(sortByDateDesc);
  }, [bookings, upcomingBookings]);

  return (
    <ClientShell name={displayName} active="reservas">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Reservas</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Mis reservas</h1>
        <p className="text-sm text-[#64748B]">
          Revisa tu próxima reserva y el estado de todos tus turnos.
        </p>
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0E2A47]">Próxima reserva</h2>
          <Link
            href="/explorar"
            className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            Explorar más
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-[#64748B]">Cargando reservas...</p>
        ) : error ? (
          <p className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {nextBooking ? (
                <ReservationCard booking={nextBooking} highlighted />
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                  No tienes reservas próximas.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                Próximas reservas
              </h3>
              {additionalUpcomingBookings.length === 0 ? (
                <p className="rounded-[16px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                  No hay más reservas próximas.
                </p>
              ) : (
                additionalUpcomingBookings.map((booking) => (
                  <ReservationCard key={booking.id} booking={booking} />
                ))
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                Historial
              </h3>
              {pastBookings.length === 0 ? (
                <p className="rounded-[16px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
                  Todavía no hay reservas pasadas.
                </p>
              ) : (
                pastBookings.map((booking) => (
                  <ReservationCard key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </ClientShell>
  );
}
