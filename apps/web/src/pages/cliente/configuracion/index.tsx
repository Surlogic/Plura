import { useState } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import ClientShell from '@/components/cliente/ClientShell';
import AppFeedbackForm from '@/components/shared/AppFeedbackForm';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { createClientAppFeedback, getClientAppFeedbackMine } from '@/services/appFeedback';
import AppFeedbackHistory from '@/components/shared/AppFeedbackHistory';
import { clearFavoriteProfessionals } from '@/services/clientFeatures';
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
  const panelClassName =
    'rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]';
  const fieldClassName =
    'h-11 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';
  const secondaryButtonClassName =
    'rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60';
  const primaryButtonClassName =
    'rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60';
  const dangerPanelClassName =
    'rounded-[24px] border border-[color:var(--error-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]';
  const dangerButtonClassName =
    'rounded-full border border-[color:var(--error-soft)] bg-transparent px-4 py-2 text-sm font-semibold text-[color:var(--error)] transition hover:bg-[color:var(--error-soft)] disabled:cursor-not-allowed disabled:opacity-60';

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
      clearFavoriteProfessionals();
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
      clearFavoriteProfessionals();
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
      <section className="space-y-2 rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lift)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Configuracion</p>
        <h1 className="text-3xl font-semibold text-[color:var(--ink)]">Preferencias de cuenta</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Ajustes basicos del panel cliente para la etapa beta.
        </p>
      </section>

      <section className="space-y-4">
        <article className={panelClassName}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Apariencia</p>
              <p className="text-xs text-[color:var(--ink-muted)]">Elegí light, dark o seguir el sistema.</p>
            </div>
            <ThemeSwitcher />
          </div>
        </article>
        <article className={panelClassName}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Recordatorios por email</p>
              <p className="text-xs text-[color:var(--ink-muted)]">Recibe avisos antes de cada turno.</p>
            </div>
            <span className="rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--success)]">
              Activo
            </span>
          </div>
        </article>
        <article className={panelClassName}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Recordatorios push</p>
              <p className="text-xs text-[color:var(--ink-muted)]">Proximamente en version movil.</p>
            </div>
            <span className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--ink-muted)]">
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
        <article className={panelClassName}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--ink)]">Verificación de teléfono</p>
                <p className="text-xs text-[color:var(--ink-muted)]">Estado actual del teléfono principal de tu cuenta.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                profile?.phoneVerified
                  ? 'bg-[color:var(--success-soft)] text-[color:var(--success)]'
                  : 'bg-[color:var(--warning-soft)] text-[color:var(--warning)]'
              }`}>
                {profile?.phoneVerified ? 'Verificado' : 'Pendiente'}
              </span>
            </div>

            <p className="text-sm text-[color:var(--ink)]">{profile?.phoneNumber || 'Sin teléfono cargado'}</p>

            {!profile?.phoneVerified ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSendPhoneVerification();
                    }}
                    disabled={isSendingPhoneVerification}
                    className={secondaryButtonClassName}
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
                    className={`min-w-[220px] ${fieldClassName}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleConfirmPhoneVerification();
                    }}
                    disabled={isConfirmingPhoneVerification}
                    className={primaryButtonClassName}
                  >
                    {isConfirmingPhoneVerification ? 'Verificando...' : 'Confirmar OTP'}
                  </button>
                </div>
              </>
            ) : null}

            {phoneVerificationMessage ? (
              <p className="text-xs font-semibold text-[color:var(--success)]">{phoneVerificationMessage}</p>
            ) : null}
            {phoneVerificationError ? (
              <p className="text-xs font-semibold text-[color:var(--error)]">{phoneVerificationError}</p>
            ) : null}
          </div>
        </article>
        <article className={panelClassName}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Cambiar contraseña</p>
              <p className="text-xs text-[color:var(--ink-muted)]">Por seguridad se cerrarán todas tus sesiones.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                placeholder="Contraseña actual"
                className={fieldClassName}
              />
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Nueva contraseña"
                className={fieldClassName}
              />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                placeholder="Confirmar contraseña"
                className={fieldClassName}
              />
            </div>

            {passwordMessage ? (
              <p className="text-xs font-semibold text-[color:var(--success)]">{passwordMessage}</p>
            ) : null}
            {passwordError ? (
              <p className="text-xs font-semibold text-[color:var(--error)]">{passwordError}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-[color:var(--primary)] underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </Link>
              <button
                type="button"
                onClick={() => {
                    void handleChangePassword();
                  }}
                  disabled={isChangingPassword}
                  className={primaryButtonClassName}
                >
                  {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
          </div>
        </article>
        <article className={panelClassName}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Feedback sobre Plura</p>
              <p className="text-xs text-[color:var(--ink-muted)]">Contanos como es tu experiencia usando la plataforma.</p>
            </div>
            <AppFeedbackForm
                onSubmit={async (request) => {
                  await createClientAppFeedback(request);
                }}
                contextSource="cliente/configuracion"
              />
            <div className="mt-6 border-t border-[color:var(--border-soft)] pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Tu historial</p>
              <AppFeedbackHistory fetchFeedback={getClientAppFeedbackMine} />
            </div>
          </div>
        </article>
        <article className={dangerPanelClassName}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-[color:var(--error)]">Eliminar cuenta</p>
              <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
                Se cancelarán tus próximas reservas y cerraremos tu sesión en todos los dispositivos.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSendDeleteChallenge('EMAIL');
                  }}
                  disabled={isSendingDeleteChallenge}
                  className={dangerButtonClassName}
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
                    className={dangerButtonClassName}
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
                className="mt-3 h-11 w-full max-w-sm rounded-[16px] border border-[color:var(--error-soft)] bg-[color:var(--surface-strong)] px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--error)] focus:outline-none focus:ring-4 focus:ring-[color:var(--error-soft)]"
              />
              {deleteChallengeMessage ? (
                <p className="mt-3 text-xs font-semibold text-[color:var(--warning)]">{deleteChallengeMessage}</p>
              ) : null}
              {deleteError ? (
                <p className="mt-3 text-xs font-semibold text-[color:var(--error)]">{deleteError}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                void handleDeleteAccount();
              }}
              disabled={isDeletingAccount}
              className={dangerButtonClassName}
            >
              {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        </article>
      </section>
    </ClientShell>
  );
}
