'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import { useRouter } from 'next/router';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import {
  getProfessionalBookingPolicy,
  updateProfessionalBookingPolicy,
} from '@/services/professionalBookingPolicy';
import api from '@/services/api';
import { clearFavoriteProfessionals } from '@/services/clientFeatures';
import { clearAuthAccessToken } from '@/services/session';
import type { LateCancellationRefundMode, ProfessionalBookingPolicy } from '@/types/bookings';
import AppFeedbackForm from '@/components/shared/AppFeedbackForm';
import Button from '@/components/ui/Button';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import { createProfessionalAppFeedback, getProfessionalAppFeedbackMine } from '@/services/appFeedback';
import AppFeedbackHistory from '@/components/shared/AppFeedbackHistory';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

const DEFAULT_MAX_CLIENT_RESCHEDULES = 1;

type BookingPolicyFormState = {
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  cancellationWindowHours: string;
  rescheduleWindowHours: string;
  maxClientReschedules: string;
  lateCancellationRefundMode: LateCancellationRefundMode;
  lateCancellationRefundValue: string;
};

const normalizeBookingPolicy = (policy: ProfessionalBookingPolicy): ProfessionalBookingPolicy => ({
  ...policy,
  maxClientReschedules:
    typeof policy.maxClientReschedules === 'number'
      ? policy.maxClientReschedules
      : DEFAULT_MAX_CLIENT_RESCHEDULES,
  lateCancellationRefundMode: policy.lateCancellationRefundMode || 'FULL',
  lateCancellationRefundValue:
    typeof policy.lateCancellationRefundValue === 'number'
      ? policy.lateCancellationRefundValue
      : policy.lateCancellationRefundMode === 'NONE'
        ? 0
        : 100,
});

const toBookingPolicyForm = (policy: ProfessionalBookingPolicy): BookingPolicyFormState => ({
  allowClientCancellation: policy.allowClientCancellation,
  allowClientReschedule: policy.allowClientReschedule,
  cancellationWindowHours:
    typeof policy.cancellationWindowHours === 'number' ? String(policy.cancellationWindowHours) : '',
  rescheduleWindowHours:
    typeof policy.rescheduleWindowHours === 'number' ? String(policy.rescheduleWindowHours) : '',
  maxClientReschedules:
    typeof policy.maxClientReschedules === 'number'
      ? String(policy.maxClientReschedules)
      : String(DEFAULT_MAX_CLIENT_RESCHEDULES),
  lateCancellationRefundMode: policy.lateCancellationRefundMode || 'FULL',
  lateCancellationRefundValue:
    typeof policy.lateCancellationRefundValue === 'number'
      ? String(policy.lateCancellationRefundValue)
      : policy.lateCancellationRefundMode === 'NONE'
        ? '0'
        : '100',
});

const createBookingPolicySignature = (form: BookingPolicyFormState | null) =>
  form
    ? JSON.stringify({
        allowClientCancellation: form.allowClientCancellation,
        allowClientReschedule: form.allowClientReschedule,
        cancellationWindowHours: form.cancellationWindowHours.trim(),
        rescheduleWindowHours: form.rescheduleWindowHours.trim(),
        maxClientReschedules: form.maxClientReschedules.trim(),
        lateCancellationRefundMode: form.lateCancellationRefundMode,
        lateCancellationRefundValue: form.lateCancellationRefundValue.trim(),
      })
    : '';

const isDigitsOnly = (value: string) => /^\d*$/.test(value.trim());

export default function ProfesionalSettingsPage() {
  const router = useRouter();
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const { clearProfile: clearClientProfile } = useClientProfileContext();
  const { clearProfile, refreshProfile } = useProfessionalProfileContext();
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isSettingsError, setIsSettingsError] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteFlowOpen, setIsDeleteFlowOpen] = useState(false);
  const [deleteChallengeId, setDeleteChallengeId] = useState<string | null>(null);
  const [deleteChallengeCode, setDeleteChallengeCode] = useState('');
  const [deleteChallengeMessage, setDeleteChallengeMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [isSendingDeleteChallenge, setIsSendingDeleteChallenge] = useState(false);
  const [isVerifyingDeleteChallenge, setIsVerifyingDeleteChallenge] = useState(false);
  const [isDeleteChallengeVerified, setIsDeleteChallengeVerified] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [isSendingPhoneVerification, setIsSendingPhoneVerification] = useState(false);
  const [isConfirmingPhoneVerification, setIsConfirmingPhoneVerification] = useState(false);
  const [bookingPolicy, setBookingPolicy] = useState<ProfessionalBookingPolicy | null>(null);
  const [bookingPolicyForm, setBookingPolicyForm] = useState<BookingPolicyFormState | null>(null);
  const [isLoadingBookingPolicy, setIsLoadingBookingPolicy] = useState(false);
  const [isSavingBookingPolicy, setIsSavingBookingPolicy] = useState(false);
  const [bookingPolicyMessage, setBookingPolicyMessage] = useState<string | null>(null);
  const [isBookingPolicyError, setIsBookingPolicyError] = useState(false);

  const bookingPolicyDirty =
    bookingPolicyForm !== null
    && bookingPolicy !== null
    && createBookingPolicySignature(bookingPolicyForm) !== createBookingPolicySignature(toBookingPolicyForm(bookingPolicy));

  useProfessionalDashboardUnsavedSection({
    sectionId: 'settings-account',
    isDirty: false,
    isSaving: isDeletingAccount,
  });

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;
    setIsLoadingBookingPolicy(true);
    setBookingPolicyMessage(null);
    setIsBookingPolicyError(false);

    getProfessionalBookingPolicy()
      .then((response) => {
        if (cancelled) return;
        const normalized = normalizeBookingPolicy(response);
        setBookingPolicy(normalized);
        setBookingPolicyForm(toBookingPolicyForm(normalized));
      })
      .catch((error) => {
        if (cancelled) return;
        setBookingPolicyMessage(
          resolveBackendMessage(error, 'No se pudo cargar la política de reagendamiento.'),
        );
        setIsBookingPolicyError(true);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingBookingPolicy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const resetDeleteFlowState = () => {
    setDeleteChallengeId(null);
    setDeleteChallengeCode('');
    setDeleteChallengeMessage(null);
    setDeleteSuccessMessage(null);
    setIsDeleteChallengeVerified(false);
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (!deleteChallengeId || !deleteChallengeCode.trim()) {
      setSettingsMessage('Primero enviá y validá el código recibido por email.');
      setIsSettingsError(true);
      return;
    }
    if (!isDeleteChallengeVerified) {
      setSettingsMessage('Primero validá el código antes de eliminar la cuenta.');
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
    setDeleteSuccessMessage(null);

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

  const handleSendDeleteChallenge = async () => {
    if (isSendingDeleteChallenge) return;
    setSettingsMessage(null);
    setIsSettingsError(false);
    setDeleteChallengeMessage(null);
    setDeleteSuccessMessage(null);
    setIsDeleteChallengeVerified(false);

    try {
      setIsSendingDeleteChallenge(true);
      const response = await api.post<{ challengeId: string; expiresAt: string; maskedDestination: string }>(
        '/auth/challenge/send',
        {
          purpose: 'ACCOUNT_DELETION',
          channel: 'EMAIL',
        },
      );
      setDeleteChallengeId(response.data.challengeId);
      setDeleteChallengeCode('');
      setDeleteChallengeMessage(
        `Te enviamos un código por email a ${response.data.maskedDestination}. Puede demorar hasta 1 o 2 minutos. Revisá también spam o promociones. El código vence en 10 minutos.`,
      );
    } catch (error) {
      setSettingsMessage(
        resolveBackendMessage(error, 'No se pudo enviar el código de eliminación por email.'),
      );
      setIsSettingsError(true);
    } finally {
      setIsSendingDeleteChallenge(false);
    }
  };

  const handleVerifyDeleteChallenge = async () => {
    if (isVerifyingDeleteChallenge) return;
    if (!deleteChallengeId) {
      setSettingsMessage('Primero enviá el código por email.');
      setIsSettingsError(true);
      return;
    }
    if (!deleteChallengeCode.trim()) {
      setSettingsMessage('Ingresá el código recibido para validarlo.');
      setIsSettingsError(true);
      return;
    }

    setSettingsMessage(null);
    setIsSettingsError(false);
    setDeleteSuccessMessage(null);

    try {
      setIsVerifyingDeleteChallenge(true);
      await api.post('/auth/challenge/verify', {
        challengeId: deleteChallengeId,
        code: deleteChallengeCode.trim(),
      });
      setIsDeleteChallengeVerified(true);
      setDeleteSuccessMessage('Código validado correctamente. Ya podés eliminar la cuenta.');
    } catch (error) {
      setIsDeleteChallengeVerified(false);
      setSettingsMessage(
        resolveBackendMessage(error, 'No se pudo validar el código.'),
      );
      setIsSettingsError(true);
    } finally {
      setIsVerifyingDeleteChallenge(false);
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
      clearFavoriteProfessionals();
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

  const handleBookingPolicyFieldChange = (
    patch: Partial<BookingPolicyFormState>,
  ) => {
    setBookingPolicyForm((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.allowClientReschedule === true) {
        const currentMax = Number.parseInt(next.maxClientReschedules.trim(), 10);
        if (!Number.isFinite(currentMax) || currentMax < 1) {
          next.maxClientReschedules = String(DEFAULT_MAX_CLIENT_RESCHEDULES);
        }
      }
      return next;
    });
    setBookingPolicyMessage(null);
    setIsBookingPolicyError(false);
  };

  const handleResetBookingPolicy = () => {
    if (!bookingPolicy) return;
    setBookingPolicyForm(toBookingPolicyForm(bookingPolicy));
    setBookingPolicyMessage(null);
    setIsBookingPolicyError(false);
  };

  const handleSaveBookingPolicy = async () => {
    if (!bookingPolicyForm || isSavingBookingPolicy) return;

    const cancellationWindowHours = bookingPolicyForm.cancellationWindowHours.trim();
    const rescheduleWindowHours = bookingPolicyForm.rescheduleWindowHours.trim();
    const maxClientReschedules = bookingPolicyForm.maxClientReschedules.trim();
    const lateCancellationRefundValue = bookingPolicyForm.lateCancellationRefundValue.trim();

    if (
      !isDigitsOnly(cancellationWindowHours)
      || !isDigitsOnly(rescheduleWindowHours)
      || !isDigitsOnly(maxClientReschedules)
    ) {
      setBookingPolicyMessage('Usá solo números enteros en los campos de reglas.');
      setIsBookingPolicyError(true);
      return;
    }
    if (bookingPolicyForm.lateCancellationRefundMode === 'PERCENTAGE' && !/^\d+(\.\d{1,2})?$/.test(lateCancellationRefundValue)) {
      setBookingPolicyMessage('El porcentaje de devolución debe ser un número entre 0 y 100.');
      setIsBookingPolicyError(true);
      return;
    }

    const parsedCancellationWindow = cancellationWindowHours ? Number.parseInt(cancellationWindowHours, 10) : null;
    const parsedRescheduleWindow = rescheduleWindowHours ? Number.parseInt(rescheduleWindowHours, 10) : null;
    const parsedMaxClientReschedules = maxClientReschedules
      ? Number.parseInt(maxClientReschedules, 10)
      : DEFAULT_MAX_CLIENT_RESCHEDULES;
    const parsedLateCancellationRefundValue = bookingPolicyForm.lateCancellationRefundMode === 'NONE'
      ? 0
      : bookingPolicyForm.lateCancellationRefundMode === 'FULL'
        ? 100
        : Number.parseFloat(lateCancellationRefundValue || '0');

    if (parsedCancellationWindow !== null && (parsedCancellationWindow < 0 || parsedCancellationWindow > 720)) {
      setBookingPolicyMessage('La ventana de cancelación debe estar entre 0 y 720 horas.');
      setIsBookingPolicyError(true);
      return;
    }

    if (parsedRescheduleWindow !== null && (parsedRescheduleWindow < 0 || parsedRescheduleWindow > 720)) {
      setBookingPolicyMessage('La ventana de reagendamiento debe estar entre 0 y 720 horas.');
      setIsBookingPolicyError(true);
      return;
    }

    if (parsedMaxClientReschedules < 0 || parsedMaxClientReschedules > 20) {
      setBookingPolicyMessage('La cantidad máxima debe estar entre 0 y 20.');
      setIsBookingPolicyError(true);
      return;
    }

    if (bookingPolicyForm.allowClientReschedule && parsedMaxClientReschedules < 1) {
      setBookingPolicyMessage('Si el cliente puede reagendar, la cantidad máxima debe ser al menos 1.');
      setIsBookingPolicyError(true);
      return;
    }
    if (parsedLateCancellationRefundValue < 0 || parsedLateCancellationRefundValue > 100) {
      setBookingPolicyMessage('La devolución dentro de ventana debe estar entre 0 y 100.');
      setIsBookingPolicyError(true);
      return;
    }

    setIsSavingBookingPolicy(true);
    setBookingPolicyMessage(null);
    setIsBookingPolicyError(false);

    try {
      const response = await updateProfessionalBookingPolicy({
        allowClientCancellation: bookingPolicyForm.allowClientCancellation,
        allowClientReschedule: bookingPolicyForm.allowClientReschedule,
        cancellationWindowHours: parsedCancellationWindow,
        rescheduleWindowHours: parsedRescheduleWindow,
        maxClientReschedules: parsedMaxClientReschedules,
        lateCancellationRefundMode: bookingPolicyForm.lateCancellationRefundMode,
        lateCancellationRefundValue: parsedLateCancellationRefundValue,
      });
      const normalized = normalizeBookingPolicy(response);
      setBookingPolicy(normalized);
      setBookingPolicyForm(toBookingPolicyForm(normalized));
      setBookingPolicyMessage('Política de reservas guardada correctamente.');
      setIsBookingPolicyError(false);
    } catch (error) {
      setBookingPolicyMessage(
        resolveBackendMessage(error, 'No se pudo guardar la política de reservas.'),
      );
      setIsBookingPolicyError(true);
    } finally {
      setIsSavingBookingPolicy(false);
    }
  };

  useProfessionalDashboardUnsavedSection({
    sectionId: 'settings-booking-policy',
    isDirty: bookingPolicyDirty,
    isSaving: isSavingBookingPolicy,
    onSave: handleSaveBookingPolicy,
    onReset: handleResetBookingPolicy,
  });

  const showSkeleton = !hasLoaded || (isLoading && !profile);
  const sectionCardClassName =
    'rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)]';
  const fieldClassName =
    'h-11 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';
  const secondaryButtonClassName =
    'rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60';
  const primaryButtonClassName =
    'rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <ProfessionalDashboardShell profile={profile} active="Configuración">
      <div className="space-y-6">
              <DashboardPageHeader
                eyebrow="Cuenta"
                title="Configuración de cuenta"
                description="Políticas, seguridad, apariencia y acciones sensibles en un solo panel."
                meta={
                  <DashboardHeaderBadge tone="accent">
                    Dashboard profesional
                  </DashboardHeaderBadge>
                }
                actions={
                  <Link
                    href="/profesional/dashboard/billing"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-soft)]"
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
                <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
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

                  <div className={sectionCardClassName}>
                    <DashboardSectionHeading
                      eyebrow="Apariencia"
                      title="Light, dark o sistema"
                      description="La preferencia se guarda en este navegador y se aplica sin flicker al recargar."
                    />
                    <div className="mt-4">
                      <ThemeSwitcher />
                    </div>
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

                  <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <DashboardSectionHeading
                      eyebrow="Verificación"
                      title="Teléfono first-party"
                      description="Confirmá el teléfono principal para reforzar la identidad de la cuenta."
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--ink)]">{profile?.phoneNumber || 'Sin teléfono cargado'}</p>
                        <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
                          {profile?.phoneVerified
                            ? 'Estado actual: verificado.'
                            : 'Estado actual: pendiente de verificación.'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        profile?.phoneVerified
                          ? 'bg-[color:var(--success-soft)] text-[color:var(--success)]'
                          : 'bg-[color:var(--warning-soft)] text-[color:var(--warning)]'
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
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
                    <div className="space-y-6">
                      <div className={sectionCardClassName}>
                        <DashboardSectionHeading
                          title="Facturación"
                          description="Plan, suscripcion, cambios de nivel y seguimiento del webhook ahora viven en una seccion dedicada."
                        />
                        <div className="mt-4 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4">
                          <p className="text-sm font-semibold text-[color:var(--ink)]">
                            Gestion comercial separada del resto de la cuenta
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                            Usa Facturación para cambiar a Free, abrir checkout de Pro o Premium y seguir la activación del pago.
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

                      <div className={sectionCardClassName}>
                        <DashboardSectionHeading
                          title="Política de reservas"
                          description="Definí qué margen tiene el cliente para cancelar o reagendar sin salir del panel profesional."
                        />

                        {bookingPolicyMessage ? (
                          <p className={`mt-4 rounded-[16px] border px-4 py-3 text-sm ${
                            isBookingPolicyError
                              ? 'border-[color:var(--error-soft)] bg-[color:var(--error-soft)] text-[color:var(--error)]'
                              : 'border-[color:var(--success-soft)] bg-[color:var(--success-soft)] text-[color:var(--success)]'
                          }`}>
                            {bookingPolicyMessage}
                          </p>
                        ) : null}

                        {isLoadingBookingPolicy || !bookingPolicyForm ? (
                          <div className="mt-4 space-y-3">
                            <div className="h-11 rounded-[16px] bg-[color:var(--surface-soft)]" />
                            <div className="h-11 rounded-[16px] bg-[color:var(--surface-soft)]" />
                            <div className="h-28 rounded-[18px] bg-[color:var(--surface-hover)]" />
                          </div>
                        ) : (
                          <div className="mt-4 space-y-4">
                            <label className="flex items-start gap-3 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4">
                              <input
                                type="checkbox"
                                checked={bookingPolicyForm.allowClientCancellation}
                                onChange={(event) => {
                                  handleBookingPolicyFieldChange({
                                    allowClientCancellation: event.target.checked,
                                  });
                                }}
                                className="mt-1 h-4 w-4 rounded border-[color:var(--border-strong)] text-[color:var(--primary)] focus:ring-[color:var(--focus-ring)]"
                              />
                              <div>
                                <p className="text-sm font-semibold text-[color:var(--ink)]">
                                  Permitir cancelación del cliente
                                </p>
                                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                                  El cliente verá la acción según la ventana y el estado real de la reserva.
                                </p>
                              </div>
                            </label>

                            <label className="flex items-start gap-3 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-4">
                              <input
                                type="checkbox"
                                checked={bookingPolicyForm.allowClientReschedule}
                                onChange={(event) => {
                                  handleBookingPolicyFieldChange({
                                    allowClientReschedule: event.target.checked,
                                  });
                                }}
                                className="mt-1 h-4 w-4 rounded border-[color:var(--border-strong)] text-[color:var(--primary)] focus:ring-[color:var(--focus-ring)]"
                              />
                              <div>
                                <p className="text-sm font-semibold text-[color:var(--ink)]">
                                  Permitir reagendamiento del cliente
                                </p>
                                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                                  Si está activo, el cliente puede mover la reserva a otro horario disponible.
                                </p>
                              </div>
                            </label>

                            <div className={`grid gap-4 md:grid-cols-2 ${
                              bookingPolicyForm.allowClientReschedule ? '' : 'opacity-70'
                            }`}>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                  Máximo de reagendamientos
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  step={1}
                                  disabled={!bookingPolicyForm.allowClientReschedule}
                                  value={bookingPolicyForm.maxClientReschedules}
                                  onChange={(event) => {
                                    handleBookingPolicyFieldChange({
                                      maxClientReschedules: event.target.value,
                                    });
                                  }}
                                  className="mt-1.5 h-11 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF2F6]"
                                />
                                <p className="mt-1 text-xs text-[#64748B]">
                                  Recomendado para MVP: 1 cambio por reserva.
                                </p>
                              </label>

                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                  Ventana de reagendamiento
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={720}
                                  step={1}
                                  disabled={!bookingPolicyForm.allowClientReschedule}
                                  value={bookingPolicyForm.rescheduleWindowHours}
                                  onChange={(event) => {
                                    handleBookingPolicyFieldChange({
                                      rescheduleWindowHours: event.target.value,
                                    });
                                  }}
                                  className="mt-1.5 h-11 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF2F6]"
                                  placeholder="Sin límite"
                                />
                                <p className="mt-1 text-xs text-[#64748B]">
                                  En horas antes del turno. Vacío = se mantiene abierto.
                                </p>
                              </label>

                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                  Ventana de cancelación
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={720}
                                  step={1}
                                  value={bookingPolicyForm.cancellationWindowHours}
                                  onChange={(event) => {
                                    handleBookingPolicyFieldChange({
                                      cancellationWindowHours: event.target.value,
                                    });
                                  }}
                                  className="mt-1.5 h-11 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                                  placeholder="Sin límite"
                                />
                                <p className="mt-1 text-xs text-[#64748B]">
                                  Define hasta cuándo la cancelación sigue siendo libre.
                                </p>
                              </label>

                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                  Regla dentro de ventana
                                </span>
                                <select
                                  value={bookingPolicyForm.lateCancellationRefundMode}
                                  onChange={(event) => {
                                    const nextMode = event.target.value as LateCancellationRefundMode;
                                    handleBookingPolicyFieldChange({
                                      lateCancellationRefundMode: nextMode,
                                      lateCancellationRefundValue:
                                        nextMode === 'NONE' ? '0' : nextMode === 'FULL' ? '100' : bookingPolicyForm.lateCancellationRefundValue,
                                    });
                                  }}
                                  className="mt-1.5 h-11 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none"
                                >
                                  <option value="FULL">Devolver 100%</option>
                                  <option value="NONE">No devolver</option>
                                  <option value="PERCENTAGE">Devolver porcentaje</option>
                                </select>
                                <p className="mt-1 text-xs text-[#64748B]">
                                  Define qué pasa si el cliente cancela dentro de la ventana límite.
                                </p>
                              </label>

                              <label className={`block ${bookingPolicyForm.lateCancellationRefundMode === 'PERCENTAGE' ? '' : 'opacity-70'}`}>
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                  % de devolución tardía
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  disabled={bookingPolicyForm.lateCancellationRefundMode !== 'PERCENTAGE'}
                                  value={bookingPolicyForm.lateCancellationRefundValue}
                                  onChange={(event) => {
                                    handleBookingPolicyFieldChange({
                                      lateCancellationRefundValue: event.target.value,
                                    });
                                  }}
                                  className="mt-1.5 h-11 w-full rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 text-sm text-[#0E2A47] focus:border-[#1FB6A6] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF2F6]"
                                />
                                <p className="mt-1 text-xs text-[#64748B]">
                                  Solo aplica cuando la regla es “Devolver porcentaje”.
                                </p>
                              </label>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-xs text-[#64748B]">
                                El cliente solo verá reagendar si la policy, el estado y la disponibilidad lo permiten.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={handleResetBookingPolicy}
                                  disabled={!bookingPolicyDirty || isSavingBookingPolicy}
                                  className="rounded-full border border-[#0E2A47]/10 bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Restablecer
                                </button>
                                <Button
                                  type="button"
                                  size="md"
                                  onClick={() => void handleSaveBookingPolicy()}
                                  disabled={isSavingBookingPolicy}
                                >
                                  {isSavingBookingPolicy ? 'Guardando...' : 'Guardar política'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
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
                      <div className="space-y-2">
                        <DashboardSectionHeading title="Feedback" />
                        <p className="text-sm text-[color:var(--ink-muted)]">
                          Contanos como es tu experiencia usando Plura.
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-[0_16px_36px_rgba(14,42,71,0.04)]">
                        <AppFeedbackForm
                          onSubmit={async (request) => {
                            await createProfessionalAppFeedback(request);
                          }}
                          contextSource="profesional/configuracion"
                        />
                        <div className="mt-6 border-t border-[#E2E7EC] pt-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                            Tu historial
                          </p>
                          <AppFeedbackHistory fetchFeedback={getProfessionalAppFeedbackMine} />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[#FECACA] bg-[#FFF5F5] p-5 shadow-[0_16px_36px_rgba(185,28,28,0.10)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-[#B91C1C]">
                              Zona sensible
                            </p>
                            <h2 className="mt-2 text-lg font-semibold text-[#7F1D1D]">
                              Eliminar cuenta profesional
                            </h2>
                            <p className="mt-2 text-sm text-[#9F1239]">
                              Se intentara cancelar la suscripcion activa, se daran de baja las proximas reservas y tu perfil dejara de estar disponible.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="md"
                            onClick={() => {
                              if (isDeleteFlowOpen) {
                                setIsDeleteFlowOpen(false);
                                resetDeleteFlowState();
                                return;
                              }
                              setIsDeleteFlowOpen(true);
                              setSettingsMessage(null);
                              setIsSettingsError(false);
                              setDeleteSuccessMessage(null);
                            }}
                            disabled={isDeletingAccount || isSendingDeleteChallenge || isVerifyingDeleteChallenge}
                            className="border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                          >
                            {isDeleteFlowOpen ? 'Cancelar' : 'Eliminar cuenta'}
                          </Button>
                        </div>

                        {isDeleteFlowOpen ? (
                          <div className="mt-5 space-y-4">
                            <p className="text-sm text-[#9F1239]">
                              Por seguridad, el flujo tiene 3 pasos: enviar código, validarlo y recién después confirmar la eliminación.
                            </p>

                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-[18px] border border-[#FECACA] bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B91C1C]">
                                  Paso 1
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[#7F1D1D]">
                                  Enviar código
                                </p>
                                <p className="mt-1 text-xs text-[#9F1239]">
                                  Te mandamos el OTP al email principal de la cuenta.
                                </p>
                                <Button
                                  type="button"
                                  size="md"
                                  onClick={() => {
                                    void handleSendDeleteChallenge();
                                  }}
                                  disabled={isSendingDeleteChallenge}
                                  className="mt-4 border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                                >
                                  {isSendingDeleteChallenge ? 'Enviando...' : deleteChallengeId ? 'Reenviar código' : 'Enviar código por email'}
                                </Button>
                              </div>

                              <div className="rounded-[18px] border border-[#FECACA] bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B91C1C]">
                                  Paso 2
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[#7F1D1D]">
                                  Validar código
                                </p>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={deleteChallengeCode}
                                  onChange={(event) => {
                                    setDeleteChallengeCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                                    if (isDeleteChallengeVerified) {
                                      setIsDeleteChallengeVerified(false);
                                      setDeleteSuccessMessage(null);
                                    }
                                  }}
                                  placeholder="Código OTP de 6 dígitos"
                                  disabled={!deleteChallengeId || isDeleteChallengeVerified}
                                  className="mt-3 h-11 w-full rounded-[16px] border border-[#FECACA] bg-white px-4 text-sm text-[#7F1D1D] focus:border-[#EF4444] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <Button
                                  type="button"
                                  size="md"
                                  onClick={() => {
                                    void handleVerifyDeleteChallenge();
                                  }}
                                  disabled={!deleteChallengeId || isVerifyingDeleteChallenge || isDeleteChallengeVerified}
                                  className="mt-4 border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                                >
                                  {isDeleteChallengeVerified
                                    ? 'Código validado'
                                    : isVerifyingDeleteChallenge
                                      ? 'Validando...'
                                      : 'Validar código'}
                                </Button>
                              </div>

                              <div className="rounded-[18px] border border-[#FECACA] bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B91C1C]">
                                  Paso 3
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[#7F1D1D]">
                                  Confirmar eliminación
                                </p>
                                <p className="mt-1 text-xs text-[#9F1239]">
                                  Este paso da de baja reservas, intenta cancelar la suscripción y no se puede deshacer.
                                </p>
                                <Button
                                  type="button"
                                  size="md"
                                  onClick={() => {
                                    void handleDeleteAccount();
                                  }}
                                  disabled={!isDeleteChallengeVerified || isDeletingAccount}
                                  className="mt-4 border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]"
                                >
                                  {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta ahora'}
                                </Button>
                              </div>
                            </div>

                            {deleteChallengeMessage ? (
                              <p className="text-xs font-semibold text-[#B91C1C]">
                                {deleteChallengeMessage}
                              </p>
                            ) : null}
                            {deleteSuccessMessage ? (
                              <p className="text-xs font-semibold text-[#047857]">
                                {deleteSuccessMessage}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
      </div>
    </ProfessionalDashboardShell>
  );
}
