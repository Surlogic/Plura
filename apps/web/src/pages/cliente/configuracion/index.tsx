import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';

export default function ClienteConfiguracionPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';

  return (
    <ClientShell name={displayName} active="configuracion">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Configuracion</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Preferencias de cuenta</h1>
        <p className="text-sm text-[#64748B]">
          Ajustes basicos del panel cliente para la etapa beta.
        </p>
      </section>

      <section className="space-y-4">
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0E2A47]">Recordatorios por email</p>
              <p className="text-xs text-[#64748B]">Recibe avisos antes de cada turno.</p>
            </div>
            <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1 text-xs font-semibold text-[#1FB6A6]">
              Activo
            </span>
          </div>
        </article>
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0E2A47]">Recordatorios push</p>
              <p className="text-xs text-[#64748B]">Proximamente en version movil.</p>
            </div>
            <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#64748B]">
              Proximamente
            </span>
          </div>
        </article>
      </section>
    </ClientShell>
  );
}
