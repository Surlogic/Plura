import { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';
import {
  getClientNextBooking,
  type ClientDashboardNextBooking,
} from '@/services/clientBookings';

const statusLabel: Record<'CONFIRMED' | 'PENDING', string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
};

const statusStyles: Record<'CONFIRMED' | 'PENDING', string> = {
  CONFIRMED: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
  PENDING: 'bg-[#F59E0B]/10 text-[#F59E0B]',
};

export default function ClienteReservasPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';
  const [nextBooking, setNextBooking] = useState<ClientDashboardNextBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    getClientNextBooking()
      .then((response) => {
        if (isCancelled) return;
        setNextBooking(response);
      })
      .catch(() => {
        if (isCancelled) return;
        setNextBooking(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <ClientShell name={displayName} active="reservas">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Reservas</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Mis reservas</h1>
        <p className="text-sm text-[#64748B]">
          Revisa tu proximo turno y el estado de tus reservas.
        </p>
      </section>

      <section className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#0E2A47]">Proxima reserva</h2>
          <Link
            href="/explorar"
            className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            Explorar mas
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-[#64748B]">Cargando reserva...</p>
        ) : !nextBooking ? (
          <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
            No tienes reservas activas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E7EC] text-left text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                  <th className="px-2 py-3">Fecha</th>
                  <th className="px-2 py-3">Profesional</th>
                  <th className="px-2 py-3">Servicio</th>
                  <th className="px-2 py-3">Estado</th>
                  <th className="px-2 py-3">Accion</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#F1F5F9]">
                  <td className="px-2 py-3 font-medium text-[#0E2A47]">
                    {nextBooking.date} · {nextBooking.time}
                  </td>
                  <td className="px-2 py-3 text-[#0E2A47]">{nextBooking.professional}</td>
                  <td className="px-2 py-3 text-[#64748B]">{nextBooking.service}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[nextBooking.status]}`}
                    >
                      {statusLabel[nextBooking.status]}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      disabled
                      className="rounded-full border border-[#E2E7EC] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#94A3B8] disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ClientShell>
  );
}
