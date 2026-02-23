'use client';

import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

const menuItems = [
  'Perfil',
  'Agenda',
  'Mi pagina para editar la pagina de la empresa',
  'Configuracion de horario de trabajo',
  'Creador de servicios',
  'Reservas',
];

const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

export default function ProfesionalDashboardPage() {
  return (
    <div className="min-h-screen bg-[#BFC2C5] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
        <section className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full max-w-xs rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="px-2 text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
              Panel
            </p>
            <nav className="mt-4 space-y-2 text-sm font-semibold">
              {menuItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full rounded-[16px] px-3 py-3 text-left transition ${
                    item === 'Agenda'
                      ? 'bg-[#0E2A47] text-white shadow-sm'
                      : 'border border-[#E2E7EC] bg-[#F7F9FB] text-[#0E2A47] hover:-translate-y-0.5 hover:shadow-sm'
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1">
            <div className="rounded-[34px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Agenda
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Calendario semanal
                  </h1>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Ver lista de reservas
                </button>
              </div>

              <div className="mt-6 rounded-[26px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
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
                        <div className="h-8 rounded-[12px] bg-[#0E2A47]/10" />
                        <div className="h-8 rounded-[12px] bg-[#1FB6A6]/20" />
                        <div className="h-8 rounded-[12px] bg-[#0E2A47]/10" />
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
