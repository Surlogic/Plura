import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';

export default function ClientePerfilPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';

  return (
    <ClientShell name={displayName} active="perfil">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Perfil</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Mi perfil</h1>
        <p className="text-sm text-[#64748B]">
          Datos de tu cuenta para gestionar reservas y notificaciones.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">Nombre</p>
          <p className="mt-2 text-lg font-semibold text-[#0E2A47]">
            {profile?.fullName || 'Cargando...'}
          </p>
        </article>
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">Email</p>
          <p className="mt-2 text-lg font-semibold text-[#0E2A47]">
            {profile?.email || 'Cargando...'}
          </p>
        </article>
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">Cliente desde</p>
          <p className="mt-2 text-lg font-semibold text-[#0E2A47]">
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('es-AR')
              : 'Cargando...'}
          </p>
        </article>
      </section>
    </ClientShell>
  );
}
