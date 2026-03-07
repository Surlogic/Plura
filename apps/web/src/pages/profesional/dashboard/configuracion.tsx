'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import api from '@/services/api';
import { clearAuthAccessToken } from '@/services/session';
import Button from '@/components/ui/Button';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

export default function ProfesionalSettingsPage() {
  const router = useRouter();
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const { clearProfile: clearClientProfile } = useClientProfileContext();
  const { clearProfile } = useProfessionalProfileContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isSettingsError, setIsSettingsError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'settings-account',
    isDirty: false,
    isSaving: isLoggingOut || isDeletingAccount,
  });

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    const confirmed = window.confirm(
      'Se cancelara la suscripcion activa, se daran de baja tus proximas reservas y la cuenta quedara eliminada. Esta accion no se puede deshacer.',
    );
    if (!confirmed) return;

    setIsDeletingAccount(true);
    setSettingsMessage(null);
    setIsSettingsError(false);

    try {
      await api.delete('/auth/me');
      clearAuthAccessToken();
      clearProfile();
      await router.replace('/profesional/auth/login');
    } catch (error) {
      setSettingsMessage(
        resolveBackendMessage(error, 'No se pudo eliminar la cuenta.'),
      );
      setIsSettingsError(true);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch {
      // We still clear the local session if the backend logout call fails.
    } finally {
      clearAuthAccessToken();
      clearProfile();
      clearClientProfile();
      await router.replace('/profesional/auth/login');
      setIsLoggingOut(false);
    }
  };

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active="Configuración" />
          </div>
        </aside>

        <div className="flex-1">
          <div className="px-4 pt-4 sm:px-6 lg:hidden">
            <Button type="button" size="sm" onClick={() => setIsMenuOpen((prev) => !prev)}>
              {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            </Button>
          </div>

          {isMenuOpen ? (
            <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
              <ProfesionalSidebar profile={profile} active="Configuración" />
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="space-y-6">
              <DashboardHero
                eyebrow="Cuenta"
                icon="configuracion"
                accent="ink"
                title="Acceso, sesion y acciones sensibles en un mismo lugar"
                description="La gestion comercial del plan ahora vive en Facturacion. Desde aqui mantene la cuenta, revisa accesos y administra decisiones sensibles."
                meta={
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                    Dashboard profesional
                  </span>
                }
                actions={
                  <Link
                    href="/profesional/dashboard/billing"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/18 bg-white/8 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/12"
                  >
                    Ir a Facturación
                  </Link>
                }
              />

              {settingsMessage ? (
                <p className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] ${
                  isSettingsError
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-[#cdeee9] bg-[#f0fffc] text-[#1FB6A6]'
                }`}>
                  {settingsMessage}
                </p>
              ) : null}

              {showSkeleton ? (
                <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <div className="h-5 w-48 rounded-full bg-[#E2E7EC]" />
                  <div className="mt-4 space-y-3">
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                    <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <DashboardStatCard
                      label="Email"
                      value={profile?.email || 'No disponible'}
                      detail="Credencial principal de acceso"
                      icon="configuracion"
                    />
                    <DashboardStatCard
                      label="Slug publico"
                      value={profile?.slug || 'No disponible'}
                      detail="Identificador visible del perfil"
                      icon="publica"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Facturación"
                      value="Separada"
                      detail="Plan y suscripcion viven en su propia seccion"
                      icon="plan"
                      tone="warm"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                        <DashboardSectionHeading
                          title="Acceso"
                          description="Datos base del profesional y referencias de identidad publica."
                        />
                        <div className="mt-4 grid gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                              Email
                            </p>
                            <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                              {profile?.email || 'No disponible'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                              Slug publico
                            </p>
                            <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                              {profile?.slug || 'No disponible'}
                            </p>
                          </div>
                          <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
                            <p className="text-sm font-semibold text-[#0E2A47]">
                              Sesion actual
                            </p>
                            <p className="mt-1 text-sm text-[#64748B]">
                              Cerra sesion desde aca si queres salir del dashboard profesional.
                            </p>
                            <Button
                              type="button"
                              size="md"
                              onClick={() => void handleLogout()}
                              disabled={isLoggingOut}
                              className="mt-4"
                            >
                              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                        <DashboardSectionHeading
                          title="Facturación"
                          description="Plan, suscripcion, cambios de nivel y seguimiento del webhook ahora viven en una seccion dedicada."
                        />
                        <div className="mt-4 rounded-[18px] border border-[#D8EBE7] bg-[#F7FBFA] p-4">
                          <p className="text-sm font-semibold text-[#0E2A47]">
                            Gestion comercial separada del resto de la cuenta
                          </p>
                          <p className="mt-1 text-sm text-[#64748B]">
                            Usa Facturacion para cambiar a BASIC, abrir checkout de PRO o PREMIUM y seguir la activacion del pago.
                          </p>
                          <Button
                            href="/profesional/dashboard/billing"
                            size="md"
                            className="mt-4"
                          >
                            Abrir Facturación
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-[#FECACA] bg-[#FFF5F5] p-5 shadow-[0_16px_36px_rgba(185,28,28,0.10)]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#B91C1C]">
                          Zona sensible
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#7F1D1D]">
                          Eliminar cuenta profesional
                        </h2>
                        <p className="mt-2 text-sm text-[#9F1239]">
                          Se intentara cancelar la suscripcion activa, se daran de baja las proximas reservas y tu perfil dejara de estar disponible.
                        </p>
                        <Button
                          type="button"
                          size="md"
                          onClick={() => {
                            void handleDeleteAccount();
                          }}
                          disabled={isDeletingAccount}
                          className="mt-4 border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                        >
                          {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
