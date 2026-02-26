import Link from 'next/link';
import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';

export default function ClienteFavoritosPage() {
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';

  return (
    <ClientShell name={displayName} active="favoritos">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Favoritos</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Tus favoritos</h1>
        <p className="text-sm text-[#64748B]">
          Guarda profesionales para volver mas rapido a reservar.
        </p>
      </section>

      <section className="rounded-[24px] border border-dashed border-[#E2E7EC] bg-white p-6 text-sm text-[#64748B]">
        Todavia no marcaste profesionales como favoritos.
        <div className="mt-4">
          <Link
            href="/explorar"
            className="inline-flex rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Explorar profesionales
          </Link>
        </div>
      </section>
    </ClientShell>
  );
}
