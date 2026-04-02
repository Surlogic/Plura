'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { isAxiosError } from 'axios';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import api from '@/services/api';
import { setAuthAccessToken } from '@/services/session';

type AuthMode = 'register' | 'login';

type ReservationAuthOverlayProps = {
  dateLabel: string;
  isOpen: boolean;
  onAuthenticated: () => Promise<void> | void;
  onClose: () => void;
  professionalName?: string | null;
  serviceName?: string | null;
  timeLabel?: string | null;
};

const resolveApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }
  return fallback;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginFormInitial = {
  email: '',
  password: '',
};

const registerFormInitial = {
  confirmEmail: '',
  confirmPassword: '',
  email: '',
  fullName: '',
  password: '',
  phoneNumber: '',
};

export default function ReservationAuthOverlay({
  dateLabel,
  isOpen,
  onAuthenticated,
  onClose,
  professionalName,
  serviceName,
  timeLabel,
}: ReservationAuthOverlayProps) {
  const router = useRouter();
  const { refreshProfile } = useClientProfileContext();
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<AuthMode>('register');
  const [loginForm, setLoginForm] = useState(loginFormInitial);
  const [registerForm, setRegisterForm] = useState(registerFormInitial);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegisterMode = mode === 'register';
  const isBusy = isSubmitting || isGoogleLoading;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isBusy, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setMode('register');
      setLoginForm(loginFormInitial);
      setRegisterForm(registerFormInitial);
      setErrorMessage(null);
      setIsGoogleLoading(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const registerValidation = useMemo(() => {
    const email = registerForm.email.trim().toLowerCase();
    const confirmEmail = registerForm.confirmEmail.trim().toLowerCase();

    return {
      confirmEmail:
        confirmEmail.length > 0 && confirmEmail === email ? '' : 'Los correos no coinciden.',
      confirmPassword:
        registerForm.confirmPassword.length > 0 &&
        registerForm.confirmPassword === registerForm.password
          ? ''
          : 'Las contraseñas no coinciden.',
      email: emailPattern.test(email) ? '' : 'Email inválido.',
      fullName:
        registerForm.fullName.trim().length >= 3 ? '' : 'Ingresá tu nombre completo.',
      password:
        registerForm.password.trim().length >= 8
          ? ''
          : 'La contraseña debe tener al menos 8 caracteres.',
      phoneNumber:
        registerForm.phoneNumber.replace(/\D/g, '').length >= 8
          ? ''
          : 'Ingresá un celular válido.',
    };
  }, [registerForm]);

  const continueAuthenticatedFlow = async () => {
    await api.get('/auth/me/cliente');
    await refreshProfile();
    await onAuthenticated();
  };

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);

    if (result.role === 'PROFESSIONAL') {
      setErrorMessage('Esta cuenta está registrada como profesional. Usá una cuenta cliente para reservar.');
      return;
    }

    const requiresPhoneCompletion = !(result.user.phoneNumber ?? '').trim();
    if (requiresPhoneCompletion) {
      void router.push('/cliente/auth/complete-phone?redirect=confirm-reservation');
      return;
    }

    await continueAuthenticatedFlow();
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({
      ...current,
      [name]: name === 'email' ? value.toLowerCase() : value,
    }));
  };

  const handleRegisterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({
      ...current,
      [name]: name === 'email' || name === 'confirmEmail' ? value.toLowerCase() : value,
    }));
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const response = await api.post<{ accessToken?: string | null }>('/auth/login/cliente', {
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });
      setAuthAccessToken(response.data?.accessToken ?? null, 'CLIENT');
      await continueAuthenticatedFlow();
    } catch (error) {
      setErrorMessage(
        resolveApiMessage(error, 'No pudimos iniciar tu sesión. Verificá tus datos.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const validationErrors = Object.values(registerValidation).filter(Boolean);
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }

    const email = registerForm.email.trim().toLowerCase();
    const password = registerForm.password;

    try {
      setIsSubmitting(true);
      await api.post('/auth/register/cliente', {
        email,
        fullName: registerForm.fullName.trim(),
        password,
        phoneNumber: registerForm.phoneNumber.trim(),
      });

      const loginResponse = await api.post<{ accessToken?: string | null }>('/auth/login/cliente', {
        email,
        password,
      });
      setAuthAccessToken(loginResponse.data?.accessToken ?? null, 'CLIENT');
      await continueAuthenticatedFlow();
    } catch (error) {
      setErrorMessage(
        resolveApiMessage(error, 'No pudimos crear tu cuenta. Revisá los datos e intentá otra vez.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const fullLoginHref = '/cliente/auth/login?redirect=confirm-reservation';
  const fullRegisterHref = '/cliente/auth/register?redirect=confirm-reservation';
  const inputClassName =
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] transition focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(18,49,38,0.36)] backdrop-blur-[4px]"
        onClick={onClose}
        aria-label="Cerrar acceso para completar la reserva"
        disabled={isBusy}
      />

      <Card
        tone="default"
        className="relative z-[1] flex w-full max-w-[1080px] flex-col overflow-hidden rounded-[34px] border-white/80 bg-white/97 shadow-[0_36px_96px_-48px_rgba(15,23,42,0.38)] lg:flex-row"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#123126_0%,#163e31_100%)] px-6 py-7 text-white lg:w-[380px] lg:px-7 lg:py-8">
          <div className="pointer-events-none absolute -left-12 top-12 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[color:var(--accent)]/20 blur-3xl" />

          <div className="relative space-y-5">
            <Badge variant="accent" className="border-white/20 bg-white/10 text-white">
              Paso final
            </Badge>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold leading-tight">
                Completá tu acceso para confirmar la reserva
              </h2>
              <p className="text-sm leading-6 text-white/78">
                Registrate en segundos o iniciá sesión si ya tenés cuenta. Cuando termines,
                seguimos con este mismo turno.
              </p>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/12 bg-white/8 p-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/62">
                  Profesional
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {professionalName || 'Tu profesional'}
                </p>
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/62">
                  Servicio
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {serviceName || 'Servicio seleccionado'}
                </p>
              </div>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/62">
                  Turno
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-white">{dateLabel}</p>
                {timeLabel ? (
                  <p className="mt-1 text-sm text-white/76">{timeLabel}</p>
                ) : null}
              </div>
            </div>

            <p className="text-xs leading-5 text-white/62">
              Si preferís, también podés seguir desde las pantallas completas de acceso sin perder
              este turno.
            </p>
          </div>
        </div>

        <div className="flex-1 px-6 py-7 sm:px-7 lg:px-8 lg:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                Acceso cliente
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
                {isRegisterMode ? 'Crear cuenta y continuar' : 'Ingresar y continuar'}
              </h3>
            </div>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={onClose}
              disabled={isBusy}
            >
              Cerrar
            </Button>
          </div>

          <div className="mt-6 inline-flex rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isRegisterMode
                  ? 'bg-white text-[color:var(--ink)] shadow-[var(--shadow-card)]'
                  : 'text-[color:var(--ink-muted)]'
              }`}
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              disabled={isBusy}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                !isRegisterMode
                  ? 'bg-white text-[color:var(--ink)] shadow-[var(--shadow-card)]'
                  : 'text-[color:var(--ink-muted)]'
              }`}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              disabled={isBusy}
            >
              Ya tengo cuenta
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <div className="space-y-2">
              <GoogleLoginButton
                authAction={isRegisterMode ? 'REGISTER' : 'LOGIN'}
                intendedRole="USER"
                onAuthenticated={handleOAuthAuthenticated}
                onError={setErrorMessage}
                buttonLabel={isRegisterMode ? 'Continuar con Google' : 'Ingresar con Google'}
                loadingLabel={isRegisterMode ? 'Conectando Google...' : 'Ingresando con Google...'}
                onLoadingChange={setIsGoogleLoading}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                o con email
              </span>
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
            </div>
          </div>

          {isRegisterMode ? (
            <form className="mt-6 space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Nombre completo</label>
                <input
                  ref={firstInputRef}
                  className={inputClassName}
                  placeholder="Tu nombre y apellido"
                  name="fullName"
                  value={registerForm.fullName}
                  onChange={handleRegisterChange}
                  required
                  minLength={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
                  <input
                    className={inputClassName}
                    placeholder="tucorreo@gmail.com"
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">
                    Confirmar email
                  </label>
                  <input
                    className={inputClassName}
                    placeholder="tucorreo@gmail.com"
                    type="email"
                    name="confirmEmail"
                    value={registerForm.confirmEmail}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Celular</label>
                <InternationalPhoneField
                  value={registerForm.phoneNumber}
                  onChange={(nextPhoneNumber) => {
                    setRegisterForm((current) => ({
                      ...current,
                      phoneNumber: nextPhoneNumber,
                    }));
                  }}
                  required
                  selectClassName={inputClassName}
                  inputClassName={inputClassName}
                  inputPlaceholder="11 2345 6789"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                  <input
                    className={inputClassName}
                    placeholder="Mínimo 8 caracteres"
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">
                    Confirmar contraseña
                  </label>
                  <input
                    className={inputClassName}
                    placeholder="Repetí tu contraseña"
                    type="password"
                    name="confirmPassword"
                    value={registerForm.confirmPassword}
                    onChange={handleRegisterChange}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isBusy}
              >
                {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta y confirmar'}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Email</label>
                <input
                  ref={firstInputRef}
                  className={inputClassName}
                  placeholder="tucorreo@gmail.com"
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                <input
                  className={inputClassName}
                  placeholder="••••••••"
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isBusy}
              >
                {isSubmitting ? 'Ingresando...' : 'Ingresar y confirmar'}
              </Button>
            </form>
          )}

          {errorMessage ? (
            <p className="mt-4 rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[color:var(--ink-muted)]">
            <span>¿Preferís seguir afuera de esta pantalla?</span>
            <Link
              href={fullRegisterHref}
              className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4"
            >
              Registro completo
            </Link>
            <span className="text-[color:var(--ink-faint)]">·</span>
            <Link
              href={fullLoginHref}
              className="font-semibold text-[color:var(--accent-strong)] underline underline-offset-4"
            >
              Login completo
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
