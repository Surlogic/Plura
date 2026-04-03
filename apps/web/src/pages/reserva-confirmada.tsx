'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

const resolveQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

export default function ReservationConfirmedPage() {
  const router = useRouter();
  const reservationId = resolveQueryValue(router.query.id).trim();
  const professional = resolveQueryValue(router.query.professional).trim();
  const service = resolveQueryValue(router.query.service).trim();
  const date = resolveQueryValue(router.query.date).trim();
  const time = resolveQueryValue(router.query.time).trim();
  const status = resolveQueryValue(router.query.status).trim();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFCF8_0%,#F5F1EB_48%,#E9DECE_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-4 pb-24 pt-12 sm:px-6">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
            Confirmación
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0E2A47]">Reserva confirmada</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Tu reserva se creó correctamente.
          </p>

          <div className="mt-6 space-y-2 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4 text-sm text-[#0E2A47]">
            {reservationId ? (
              <p>
                ID de reserva: <span className="font-semibold">#{reservationId}</span>
              </p>
            ) : null}
            {professional ? (
              <p>
                Profesional: <span className="font-semibold">{professional}</span>
              </p>
            ) : null}
            {service ? (
              <p>
                Servicio: <span className="font-semibold">{service}</span>
              </p>
            ) : null}
            {date || time ? (
              <p>
                Fecha y hora:{' '}
                <span className="font-semibold">
                  {[date, time].filter(Boolean).join(' ')}
                </span>
              </p>
            ) : null}
            {status ? (
              <p>
                Estado: <span className="font-semibold">{status}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/cliente/reservas"
              className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Ver mis reservas
            </Link>
            <Link
              href="/explorar"
              className="rounded-full border border-[#0E2A47]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Seguir explorando
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
