import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/router';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ClientShell from '@/components/cliente/ClientShell';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import api from '@/services/api';
import { clearAuthAccessToken } from '@/services/session';

export default function ClienteConfiguracionPage() {
  const router = useRouter();
  const { profile } = useClientProfile();
  const { clearProfile, refreshProfile } = useClientProfileContext();
  const displayName = profile?.fullName || 'Cliente';
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteChallengeId, setDeleteChallengeId] = useState<string | null>(null);
  const [deleteChallengeCode, setDeleteChallengeCode] = useState('');
  const [deleteChallengeMessage, setDeleteChallengeMessage] = useState<string | null>(null);
  const [isSendingDeleteChallenge, setIsSendingDeleteChallenge] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
  const [isSendingPhoneVerification, setIsSendingPhoneVerification] = useState(false);
  const [isConfirmingPhoneVerification, setIsConfirmingPhoneVerification] = useState(false);

  const resolveBackendMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message || fallback;
    }
    return fallback;
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
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
      await router.replace('/cliente/auth/login');
    } catch (error) {
      setPasswordError(
        resolveBackendMessage(error, 'No se pudo actualizar la contraseña.'),
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (!deleteChallengeId || !deleteChallengeCode.trim()) {
      setDeleteError('Primero solicitá el challenge e ingresá el código recibido.');
      return;
    }
    const confirmed = window.confirm(
      'Se cancelarán tus próximas reservas y la cuenta quedará eliminada. Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await api.delete('/auth/me', {
        data: {
          challengeId: deleteChallengeId,
          code: deleteChallengeCode.trim(),
        },
      });
      clearAuthAccessToken();
      clearProfile();
      await router.replace('/cliente/auth/login');
    } catch {
      setDeleteError('No se pudo eliminar la cuenta. Intenta nuevamente.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSendDeleteChallenge = async (channel: 'EMAIL' | 'SMS') => {
    if (isSendingDeleteChallenge) return;
    setDeleteError(null);
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
      setDeleteError(resolveBackendMessage(error, 'No se pudo enviar el challenge.'));
    } finally {
      setIsSendingDeleteChallenge(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (isSendingPhoneVerification || !profile) return;
    setPhoneVerificationMessage(null);
    setPhoneVerificationError(null);

    try {
      setIsSendingPhoneVerification(true);
      const response = await api.post<{ message: string; cooldownSeconds?: number | null }>(
        '/auth/verify/phone/send',
        {},
      );
      const suffix = response.data.cooldownSeconds && response.data.cooldownSeconds > 0
        ? ` Podés reenviar en ${response.data.cooldownSeconds}s.`
        : '';
      setPhoneVerificationMessage(`${response.data.message}${suffix}`);
      await refreshProfile();
    } catch (error) {
      setPhoneVerificationError(resolveBackendMessage(error, 'No se pudo enviar el código.'));
    } finally {
      setIsSendingPhoneVerification(false);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    if (isConfirmingPhoneVerification || !profile) return;
    setPhoneVerificationMessage(null);
    setPhoneVerificationError(null);

    try {
      setIsConfirmingPhoneVerification(true);
      await api.post('/auth/verify/phone/confirm', {
        code: phoneVerificationCode.trim(),
      });
      setPhoneVerificationMessage('Teléfono verificado correctamente.');
      setPhoneVerificationCode('');
      await refreshProfile();
    } catch (error) {
      setPhoneVerificationError(resolveBackendMessage(error, 'No se pudo verificar el código.'));
    } finally {
      setIsConfirmingPhoneVerification(false);
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
        <EmailVerificationPanel
          email={profile?.email}
          emailVerified={profile?.emailVerified}
          onStatusChanged={refreshProfile}
          tone="client"
          variant="section"
          title="Verificación de email"
          description="Estado actual del email principal de tu cuenta. Podés enviar, confirmar y reenviar el código desde acá sin recargar la página."
        />
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0E2A47]">Verificación de teléfono</p>
                <p className="text-xs text-[#64748B]">Estado actual del teléfono principal de tu cuenta.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                profile?.phoneVerified
                  ? 'bg-[#1FB6A6]/10 text-[#1FB6A6]'
                  : 'bg-[#FFF7ED] text-[#B45309]'
              }`}>
                {profile?.phoneVerified ? 'Verificado' : 'Pendiente'}
              </span>
            </div>

            <p className="text-sm text-[#0E2A47]">{profile?.phoneNumber || 'Sin teléfono cargado'}</p>

            {!profile?.phoneVerified ? (
              <>
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
              </>
            ) : null}

            {phoneVerificationMessage ? (
              <p className="text-xs font-semibold text-[#1FB6A6]">{phoneVerificationMessage}</p>
            ) : null}
            {phoneVerificationError ? (
              <p className="text-xs font-semibold text-[#B91C1C]">{phoneVerificationError}</p>
            ) : null}
          </div>
        </article>
        <article className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#0E2A47]">Cambiar contraseña</p>
              <p className="text-xs text-[#64748B]">Por seguridad se cerrarán todas tus sesiones.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
            </div>

            {passwordMessage ? (
              <p className="text-xs font-semibold text-[#1FB6A6]">{passwordMessage}</p>
            ) : null}
            {passwordError ? (
              <p className="text-xs font-semibold text-[#B91C1C]">{passwordError}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href="/auth/forgot-password"
                className="text-xs font-semibold text-[#1FB6A6] underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </a>
              <button
                type="button"
                onClick={() => {
                  void handleChangePassword();
                }}
                disabled={isChangingPassword}
                className="rounded-full bg-[#0E2A47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12385f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>
        </article>
        <article className="rounded-[24px] border border-[#FECACA] bg-[#FFF5F5] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-[#991B1B]">Eliminar cuenta</p>
              <p className="mt-1 text-xs text-[#B45309]">
                Se cancelarán tus próximas reservas y cerraremos tu sesión en todos los dispositivos.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSendDeleteChallenge('EMAIL');
                  }}
                  disabled={isSendingDeleteChallenge}
                  className="rounded-full border border-[#FCA5A5] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por email'}
                </button>
                {profile?.phoneNumber ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSendDeleteChallenge('SMS');
                    }}
                    disabled={isSendingDeleteChallenge}
                    className="rounded-full border border-[#FCA5A5] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingDeleteChallenge ? 'Enviando...' : 'Enviar código por SMS'}
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={deleteChallengeCode}
                onChange={(event) => setDeleteChallengeCode(event.target.value)}
                placeholder="Código OTP para eliminar la cuenta"
                className="mt-3 h-11 w-full max-w-sm rounded-[16px] border border-[#FECACA] bg-white px-4 text-sm text-[#7F1D1D] focus:border-[#F87171] focus:outline-none"
              />
              {deleteChallengeMessage ? (
                <p className="mt-3 text-xs font-semibold text-[#B45309]">{deleteChallengeMessage}</p>
              ) : null}
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
