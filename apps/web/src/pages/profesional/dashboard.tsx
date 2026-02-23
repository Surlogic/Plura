'use client';

import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

const menuItems = [
  { label: 'Perfil del negocio', active: false },
  { label: 'Agenda', active: true },
  { label: 'Página pública', active: false },
  { label: 'Horarios de trabajo', active: false },
  { label: 'Servicios', active: false },
  { label: 'Reservas', active: false },
];

const stats = [
  { label: 'Reservas hoy', value: '8', detail: '+3 vs ayer' },
  { label: 'Ocupación semanal', value: '76%', detail: 'Meta 85%' },
  { label: 'Clientes nuevos', value: '12', detail: 'Últimos 7 días' },
];

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ProfesionalDashboardPage() {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]"
      style={{ fontFamily: '"Manrope", "Segoe UI", sans-serif' }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
        <section className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="rounded-[26px] bg-[#0B1D2A] p-5 text-white shadow-[0_20px_60px_rgba(4,16,32,0.35)]">
            <div className="flex items-center gap-3 rounded-[18px] bg-white/10 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                AG
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Profesional
                </p>
                <p className="text-sm font-semibold">Atelier Glow</p>
              </div>
            </div>
            <p className="mt-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
              Navegación
            </p>
            <nav className="mt-3 space-y-2 text-sm font-semibold">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`w-full rounded-[16px] px-3 py-3 text-left transition ${
                    item.active
                      ? 'bg-white text-[#0B1D2A] shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 rounded-[18px] bg-white/10 p-4 text-xs text-white/70">
              Tip: completá tu perfil para aparecer en las búsquedas destacadas.
            </div>
          </aside>

          <div className="space-y-6">
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
