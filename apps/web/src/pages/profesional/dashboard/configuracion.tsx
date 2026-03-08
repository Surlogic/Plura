'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
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
  const { clearProfile, refreshProfile } = useProfessionalProfileContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isSettingsError, setIsSettingsError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteChallengeId, setDeleteChallengeId] = useState<string | null>(null);
  const [deleteChallengeCode, setDeleteChallengeCode] = useState('');
  const [deleteChallengeMessage, setDeleteChallengeMessage] = useState<string | null>(null);
  const [isSendingDeleteChallenge, setIsSendingDeleteChallenge] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [isSendingPhoneVerification, setIsSendingPhoneVerification] = useState(false);
  const [isConfirmingPhoneVerification, setIsConfirmingPhoneVerification] = useState(false);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'settings-account',
    isDirty: false,
    isSaving: isLoggingOut || isDeletingAccount,
  });

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (!deleteChallengeId || !deleteChallengeCode.trim()) {
      setSettingsMessage('Primero solicitá el challenge e ingresá el código recibido.');
      setIsSettingsError(true);
      return;
    }
    const confirmed = window.confirm(
      'Se cancelara la suscripcion activa, se daran de baja tus proximas reservas y la cuenta quedara eliminada. Esta accion no se puede deshacer.',
    );
    if (!confirmed) return;

    setIsDeletingAccount(true);
    setSettingsMessage(null);
    setIsSettingsError(false);

    try {
      await api.delete('/auth/me', {
        data: {
          challengeId: deleteChallengeId,
          code: deleteChallengeCode.trim(),
        },
      });
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

  const handleSendDeleteChallenge = async (channel: 'EMAIL' | 'SMS') => {
    if (isSendingDeleteChallenge) return;
    setSettingsMessage(null);
    setIsSettingsError(false);
    setDeleteChallengeMessage(null);

    try {
      setIsSendingDeleteChallenge(true);
      const response = await api.post<{ challengeId: string; expiresAt: string; maskedDestination: string }>(
        '/auth/challenge/send',
        {
          purpose: 'ACCOUNT_DELETION',
          channel,
        },
      );
      setDeleteChallengeId(response.data.challengeId);
      setDeleteChallengeMessage(
        `Código enviado por ${channel === 'EMAIL' ? 'email' : 'SMS'} a ${response.data.maskedDestination}.`,
      );
    } catch (error) {
      setSettingsMessage(
        resolveBackendMessage(error, 'No se pudo enviar el challenge de eliminación.'),
      );
      setIsSettingsError(true);
    } finally {
      setIsSendingDeleteChallenge(false);
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

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    setSettingsMessage(null);
    setIsSettingsError(false);

    if (passwordForm.newPassword.length < 8) {
      setSettingsMessage('La contraseña debe tener al menos 8 caracteres.');
      setIsSettingsError(true);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSettingsMessage('Las contraseñas no coinciden.');
      setIsSettingsError(true);
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/password/change', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      clearAuthAccessToken();
      clearProfile();
      clearClientProfile();
      await router.replace('/profesional/auth/login');
    } catch (error) {
      setSettingsMessage(
        resolveBackendMessage(error, 'No se pudo actualizar la contraseña.'),
      );
      setIsSettingsError(true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (isSendingPhoneVerification || !profile) return;
    setSettingsMessage(null);
    setIsSettingsError(false);

    try {
      setIsSendingPhoneVerification(true);
      const response = await api.post<{ message: string; cooldownSeconds?: number | null }>(
        '/auth/verify/phone/send',
        {},
      );
      const suffix = response.data.cooldownSeconds && response.data.cooldownSeconds > 0
        ? ` Podés reenviar en ${response.data.cooldownSeconds}s.`
        : '';
      setSettingsMessage(`${response.data.message}${suffix}`);
      await refreshProfile();
    } catch (error) {
      setSettingsMessage(resolveBackendMessage(error, 'No se pudo enviar el OTP.'));
      setIsSettingsError(true);
    } finally {
      setIsSendingPhoneVerification(false);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    if (isConfirmingPhoneVerification || !profile) return;
    setSettingsMessage(null);
    setIsSettingsError(false);

    try {
      setIsConfirmingPhoneVerification(true);
      await api.post('/auth/verify/phone/confirm', {
        code: phoneVerificationCode.trim(),
      });
      setPhoneVerificationCode('');
      setSettingsMessage('Teléfono verificado correctamente.');
      await refreshProfile();
    } catch (error) {
      setSettingsMessage(resolveBackendMessage(error, 'No se pudo verificar el OTP.'));
      setIsSettingsError(true);
    } finally {
      setIsConfirmingPhoneVerification(false);
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
                      detail={profile?.emailVerified ? 'Email verificado' : 'Email pendiente de verificación'}
                      icon="configuracion"
                    />
                    <DashboardStatCard
                      label="Teléfono"
                      value={profile?.phoneNumber || 'No disponible'}
                      detail={profile?.phoneVerified ? 'Teléfono verificado' : 'Teléfono pendiente de verificación'}
                      icon="configuracion"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Slug publico"
                      value={profile?.slug || 'No disponible'}
                      detail="Identificador visible del perfil"
                      icon="publica"
                    />
                    <DashboardStatCard
                      label="Facturación"
                      value="Separada"
                      detail="Plan y suscripcion viven en su propia seccion"
                      icon="plan"
                      tone="warm"
                    />
                  </div>

                  <EmailVerificationPanel
                    email={profile?.email}
                    emailVerified={profile?.emailVerified}
                    onStatusChanged={refreshProfile}
                    tone="professional"
                    variant="section"
                    title="Email first-party"
                    description="Confirmá el email principal para reforzar la identidad de la cuenta. El estado se actualiza en el dashboard sin requerir recarga manual."
                  />

                  <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <DashboardSectionHeading
                      eyebrow="Verificación"
                      title="Teléfono first-party"
                      description="Confirmá el teléfono principal para reforzar la identidad de la cuenta."
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0E2A47]">{profile?.phoneNumber || 'Sin teléfono cargado'}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {profile?.phoneVerified
                            ? 'Estado actual: verificado.'
                            : 'Estado actual: pendiente de verificación.'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        profile?.phoneVerified
                          ? 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
                          : 'bg-[#FFF7ED] text-[#B45309]'
                      }`}>
                        {profile?.phoneVerified ? 'Verificado' : 'Pendiente'}
                      </span>
                    </div>

                    {!profile?.phoneVerified ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              void handleSendPhoneVerification();
                            }}
                            disabled={isSendingPhoneVerification}
                            className="rounded-full border border-[#0E2A47]/10 bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSendingPhoneVerification ? 'Enviando...' : 'Enviar OTP'}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={phoneVerificationCode}
                            onChange={(event) => setPhoneVerificationCode(event.target.value)}
                            placeholder="OTP de 6 dígitos"
                            className="h-11 min-w-[220px] rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleConfirmPhoneVerification();
                            }}
                            disabled={isConfirmingPhoneVerification}
                            className="rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12385f] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isConfirmingPhoneVerification ? 'Verificando...' : 'Confirmar OTP'}
                          </button>
                        </div>
                      </div>
                    ) : null}
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

                      <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                        <DashboardSectionHeading
                          title="Contraseña"
                          description="Actualizar la contraseña invalida todas las sesiones activas por seguridad."
                        />
                        <div className="mt-4 grid gap-3">
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                            placeholder="Contraseña actual"
                            className="h-11 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                          />
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                            placeholder="Nueva contraseña"
                            className="h-11 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                          />
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                            placeholder="Confirmar contraseña"
                            className="h-11 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <Link
                              href="/auth/forgot-password"
                              className="text-xs font-semibold text-[#0f766e] underline underline-offset-4"
                            >
                              ¿Olvidaste tu contraseña?
                            </Link>
                            <Button
                              type="button"
                              size="md"
                              onClick={() => void handleChangePassword()}
                              disabled={isChangingPassword}
                            >
                              {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                            </Button>
                          </div>
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
                        <div className="mt-4 grid gap-3">
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              size="md"
                              onClick={() => {
                                void handleSendDeleteChallenge('EMAIL');
                              }}
                              disabled={isSendingDeleteChallenge}
                              className="border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                            >
                              {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por email'}
                            </Button>
                            {profile?.phoneNumber ? (
                              <Button
                                type="button"
                                size="md"
                                onClick={() => {
                                  void handleSendDeleteChallenge('SMS');
                                }}
                                disabled={isSendingDeleteChallenge}
                                className="border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                              >
                                {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por SMS'}
                              </Button>
                            ) : null}
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={deleteChallengeCode}
                            onChange={(event) => setDeleteChallengeCode(event.target.value)}
                            placeholder="Código OTP de 6 dígitos"
                            className="h-11 rounded-[16px] border border-[#FECACA] bg-white px-4 text-sm text-[#7F1D1D] focus:border-[#EF4444] focus:outline-none"
                          />
                          {deleteChallengeMessage ? (
                            <p className="text-xs font-semibold text-[#B91C1C]">
                              {deleteChallengeMessage}
                            </p>
                          ) : null}
                        </div>
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
