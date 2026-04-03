import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import api from '@/services/api';

type PasswordResetRole = 'USER' | 'PROFESSIONAL';

type PasswordResetCompletedResponse = {
  role?: PasswordResetRole | null;
};

type RecoveryVerifyPhoneResponse = {
  challengeId: string;
  expiresAt: string;
  maskedDestination: string;
};

type Step = 'email' | 'phone' | 'code';

const resolveMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

const resolveLoginPathFromRole = (role?: PasswordResetRole | null) => {
  return role === 'PROFESSIONAL' ? '/profesional/auth/login?passwordReset=1' : '/cliente/auth/login?passwordReset=1';
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitCodeStep = useMemo(() => {
    return (
      challengeId.trim().length > 0 &&
      code.trim().length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8
    );
  }, [challengeId, code, newPassword, confirmPassword]);
  const canSubmitPhoneStep = phoneNumber.replace(/\D/g, '').length >= 8;

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      const response = await api.post<{ message: string }>('/auth/password/recovery/start', {
        email: email.trim().toLowerCase(),
      });
      setMessage(response.data.message);
      setStep('phone');
    } catch (error) {
      setErrorMessage(resolveMessage(error, 'No se pudo iniciar la recuperación.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      const response = await api.post<RecoveryVerifyPhoneResponse>('/auth/password/recovery/verify-phone', {
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
      });
      setChallengeId(response.data.challengeId);
      setMaskedDestination(response.data.maskedDestination);
      setMessage(`Te enviamos un código a ${response.data.maskedDestination}.`);
      setStep('code');
    } catch (error) {
      setErrorMessage(resolveMessage(error, 'No pudimos validar el email y el teléfono.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post<PasswordResetCompletedResponse>('/auth/password/recovery/confirm', {
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        challengeId: challengeId.trim(),
        code: code.trim(),
        newPassword,
        confirmPassword,
      });
      setMessage('La contraseña fue actualizada. Redirigiendo al login correcto...');
      setStep('email');
      setChallengeId('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      await router.replace(resolveLoginPathFromRole(response.data?.role));
    } catch (error) {
      setErrorMessage(resolveMessage(error, 'No pudimos completar la recuperación.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_620px_at_5%_-10%,rgba(31,182,166,0.18),transparent_55%),linear-gradient(180deg,#f8fcfb_0%,#eef4f2_100%)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6">
        <Card tone="default" padding="lg" className="w-full max-w-md rounded-[32px]">
          <div className="space-y-3">
            <Badge variant="accent">Recuperar acceso</Badge>
            <h1 className="text-3xl font-semibold text-[color:var(--ink)]">Restablecer contraseña</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Primero validamos tu email, después tu teléfono y recién ahí enviamos un código al correo.
            </p>
          </div>

          {step === 'email' ? (
            <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
                <input
                  className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@gmail.com"
                  required
                />
              </div>
              <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Validando...' : 'Continuar'}
              </Button>
            </form>
          ) : null}

          {step === 'phone' ? (
            <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Email confirmado</label>
                <input className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-slate-50 px-4 text-sm text-[color:var(--ink)]" value={email} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Número de teléfono</label>
                <InternationalPhoneField
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required
                  selectClassName="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  inputClassName="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  inputPlaceholder="99 123 456"
                />
                <p className="text-xs text-[color:var(--ink-faint)]">
                  Elegí tu país y escribí el número sin repetir el código internacional.
                </p>
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !canSubmitPhoneStep}
              >
                {isSubmitting ? 'Verificando...' : 'Validar y enviar código'}
              </Button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form className="mt-6 space-y-4" onSubmit={handleConfirmSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Código enviado</label>
                <input
                  className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={maskedDestination ? `Código enviado a ${maskedDestination}` : 'Ingresá el código'}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Nueva contraseña</label>
                <input
                  className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Confirmar contraseña</label>
                <input
                  className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !canSubmitCodeStep}
              >
                {isSubmitting ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-[12px] border border-[#cdeee9] bg-[#f0fffc] px-3 py-2 text-xs text-[#1FB6A6]">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/cliente/auth/login" className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4">
              Volver a acceso cliente
            </Link>
            <Link href="/profesional/auth/login" className="font-semibold text-[#0f766e] underline underline-offset-4">
              Volver a acceso profesional
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
