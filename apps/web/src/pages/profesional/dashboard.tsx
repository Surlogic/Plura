'use client';

import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

const stats = [
  { label: 'Reservas hoy', value: '8', detail: '+3 vs ayer' },
  { label: 'Ocupación semanal', value: '76%', detail: 'Meta 85%' },
  { label: 'Clientes nuevos', value: '12', detail: 'Últimos 7 días' },
];

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ProfesionalDashboardPage() {
  const { profile } = useProfessionalProfile();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
        <section className="flex flex-row items-start gap-6">
          <ProfesionalSidebar profile={profile} active="Agenda" />
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Panel profesional
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Agenda y reservas
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Ver lista de reservas
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Crear turno
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Agenda
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#0E2A47]">
                    Calendario semanal
                  </h2>
                </div>
                <div className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs text-[#64748B]">
                  Semana actual
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold text-[#64748B]">
                  {weekDays.map((day) => (
                    <div key={day} className="rounded-[12px] bg-white py-2 shadow-sm">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-3">
                  {weekDays.map((day, index) => (
                    <div
                      key={`${day}-${index}`}
                      className="min-h-[220px] rounded-[18px] border border-[#E2E7EC] bg-white p-3"
                    >
                      <div className="space-y-3">
                        <div className="h-8 rounded-[12px] bg-[#0B1D2A]/10" />
                        <div className="h-8 rounded-[12px] bg-[#1FB6A6]/20" />
                        <div className="h-8 rounded-[12px] bg-[#0B1D2A]/10" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs uppercase tracking-[0.4em] text-[#94A3B8]">
                  Calendario de las agendas de la semana
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
