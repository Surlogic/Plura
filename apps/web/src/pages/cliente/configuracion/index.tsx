import { useState } from 'react';
import { useRouter } from 'next/router';
import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import api from '@/services/api';
import { clearAuthAccessToken } from '@/services/session';

export default function ClienteConfiguracionPage() {
  const router = useRouter();
  const { profile } = useClientProfile();
  const { clearProfile } = useClientProfileContext();
  const displayName = profile?.fullName || 'Cliente';
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    const confirmed = window.confirm(
      'Se cancelarán tus próximas reservas y la cuenta quedará eliminada. Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await api.delete('/auth/me');
      clearAuthAccessToken();
      clearProfile();
      await router.replace('/cliente/auth/login');
    } catch {
      setDeleteError('No se pudo eliminar la cuenta. Intenta nuevamente.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

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
        <article className="rounded-[24px] border border-[#FECACA] bg-[#FFF5F5] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-[#991B1B]">Eliminar cuenta</p>
              <p className="mt-1 text-xs text-[#B45309]">
                Se cancelarán tus próximas reservas y cerraremos tu sesión en todos los dispositivos.
              </p>
              {deleteError ? (
                <p className="mt-3 text-xs font-semibold text-[#B91C1C]">{deleteError}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                void handleDeleteAccount();
              }}
              disabled={isDeletingAccount}
              className="rounded-full border border-[#FCA5A5] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        </article>
      </section>
    </ClientShell>
  );
}
