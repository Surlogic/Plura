'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import PasswordInput from '@/components/auth/PasswordInput';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import api from '@/services/api';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import {
  activateClientProfile,
  ensureAuthContext,
  fetchAuthMe,
  selectAuthContext,
  type AuthMeResponse,
} from '@/lib/auth/contexts';
import { isValidInternationalPhoneNumber } from '@/lib/phone/internationalPhone';
import { getPendingReservation } from '@/services/pendingReservation';

export default function ClienteRegisterPage() {
  const router = useRouter();
  const { refreshProfile: refreshClientProfile } = useClientProfileContext();
  const redirectIntent = Array.isArray(router.query.redirect)
    ? router.query.redirect[0]
    : router.query.redirect;
  const addContextIntent = Array.isArray(router.query.addContext)
    ? router.query.addContext[0]
    : router.query.addContext;
  const isAddingClientContext = addContextIntent === 'client';
  const loginHref = redirectIntent === 'confirm-reservation'
    ? '/login?intent=client&redirect=confirm-reservation'
    : '/login?intent=client';
  const inputClassName =
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    confirmEmail: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    let isActive = true;
    setIsCheckingSession(isAddingClientContext);
    void fetchAuthMe()
      .then((me) => {
        if (!isActive) return;
        const activeType = me.activeContext?.type;
        const hasClientContext = me.contexts?.some((context) => context.type === 'CLIENT') || activeType === 'CLIENT';
        const hasProfessionalContext =
          me.contexts?.some((context) => context.type === 'PROFESSIONAL') || activeType === 'PROFESSIONAL';
        if (isAddingClientContext && hasClientContext) {
          void router.replace('/cliente/inicio');
          return;
        }
        if (isAddingClientContext && hasProfessionalContext) {
          setAuthMe(me);
          const email = me.user?.email?.trim().toLowerCase() ?? '';
          const fullName = me.user?.fullName?.trim() ?? '';
          setForm((prev) => ({
            ...prev,
            fullName,
            email,
            confirmEmail: email,
          }));
          return;
        }
        if (isAddingClientContext) {
          void router.replace(loginHref);
          return;
        }
        if (activeType === 'PROFESSIONAL') {
          void router.replace('/profesional/dashboard');
          return;
        }
        if (activeType === 'WORKER') {
          void router.replace('/trabajador/calendario');
          return;
        }
        void router.replace('/cliente/inicio');
      })
      .catch(() => {
        if (isActive && isAddingClientContext) {
          void router.replace(loginHref);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAddingClientContext, loginHref, router]);

  useEffect(() => {
    if (!router.isReady) return;
    const queryEmail = Array.isArray(router.query.email)
      ? router.query.email[0]
      : router.query.email;
    if (!queryEmail?.trim()) return;
    const normalizedEmail = queryEmail.trim().toLowerCase();
    setForm((prev) => ({
      ...prev,
      email: prev.email || normalizedEmail,
      confirmEmail: prev.confirmEmail || normalizedEmail,
    }));
  }, [router.isReady, router.query.email]);

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    const requiresPhoneCompletion = !(result.user.phoneNumber ?? '').trim();
    if (requiresPhoneCompletion) {
      router.push('/cliente/auth/complete-phone');
      return;
    }
    await ensureAuthContext('CLIENT');
    await refreshClientProfile();
    router.push('/cliente/inicio');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'email' || name === 'confirmEmail' ? value.toLowerCase() : value;
    setForm((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handlePhoneChange = (nextPhoneNumber: string) => {
    setForm((prev) => ({ ...prev, phoneNumber: nextPhoneNumber }));
  };

  const handlePhoneBlur = () => {
    setTouched((prev) => ({ ...prev, phoneNumber: true }));
  };

  const emailValue = form.email.trim().toLowerCase();
  const confirmEmailValue = form.confirmEmail.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIsValid = isAddingClientContext || emailPattern.test(emailValue);
  const emailsMatch =
    !isAddingClientContext &&
    confirmEmailValue.length > 0 &&
    emailPattern.test(emailValue) &&
    confirmEmailValue === emailValue;
  const passwordRules: Array<{
    id: string;
    label: string;
    test: (value: string) => boolean;
  }> = [
    {
      id: 'length',
      label: 'Mínimo 8 caracteres.',
      test: (value: string) => value.length >= 8,
    },
  ];
  const passwordChecks = passwordRules.map((rule) => ({
    ...rule,
    valid: rule.test(form.password),
  }));
  const passwordValid = passwordChecks.every((rule) => rule.valid);
  const validationErrors = {
    fullName: isAddingClientContext || form.fullName.trim().length >= 3 ? '' : 'Mínimo 3 caracteres.',
    email: emailIsValid ? '' : 'E-Mail inválido.',
    confirmEmail: isAddingClientContext || (confirmEmailValue.length > 0 && confirmEmailValue === emailValue)
      ? ''
      : 'Los e-mails no coinciden.',
    phoneNumber: isValidInternationalPhoneNumber(form.phoneNumber) ? '' : 'Ingresá un número válido para el país seleccionado.',
    password: isAddingClientContext || passwordValid ? '' : 'La contraseña no cumple los requisitos.',
    confirmPassword: isAddingClientContext || (form.confirmPassword.length > 0 && form.confirmPassword === form.password)
      ? ''
      : 'Las contraseñas no coinciden.',
  };
  const isFormValid = Object.values(validationErrors).every((value) => value === '');
  const showConfirmEmailError =
    !isAddingClientContext &&
    Boolean(validationErrors.confirmEmail) &&
    (touched.confirmEmail || form.confirmEmail.trim().length > 0 || touched.email);

  const inputClass = (field: keyof typeof validationErrors) => {
    const hasError =
      field === 'confirmEmail'
        ? showConfirmEmailError
        : touched[field] && Boolean(validationErrors[field]);
    const hasSuccess =
      !hasError &&
      ((field === 'email' && touched.email && emailIsValid && emailValue.length > 0) ||
        (field === 'confirmEmail' && emailsMatch));

    return `${inputClassName}${
      hasError
        ? ' border-red-300 text-red-700 focus:ring-red-200'
        : hasSuccess
          ? ' border-emerald-400 text-emerald-700 focus:ring-emerald-100'
          : ''
    }`;
  };

  const redirectAfterClientContextSelected = async () => {
    if (redirectIntent === 'confirm-reservation') {
      const pendingReservation = getPendingReservation();
      if (pendingReservation) {
        await router.push({
          pathname: '/reservar',
          query: {
            profesional: pendingReservation.professionalSlug,
            serviceId: pendingReservation.serviceId,
            resume: '1',
          },
        });
        return;
      }
    }

    await router.push('/cliente/inicio');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isAddingClientContext) {
      if (!authMe?.user?.email) {
        setErrorMessage('No pudimos validar tu sesión. Iniciá sesión nuevamente.');
        return;
      }
      if (validationErrors.phoneNumber) {
        setTouched((prev) => ({ ...prev, phoneNumber: true }));
        setErrorMessage('Ingresá un número de celular válido.');
        return;
      }

      try {
        setIsSubmitting(true);
        await activateClientProfile({ phoneNumber: form.phoneNumber.trim() });
        await selectAuthContext('CLIENT');
        await refreshClientProfile();
        await redirectAfterClientContextSelected();
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (!error.response) {
            setErrorMessage('No se pudo conectar con el servidor.');
          } else if (error.response.status === 401) {
            setErrorMessage('Sesión vencida. Iniciá sesión nuevamente.');
          } else if (error.response.status === 409) {
            const apiMessage = error.response.data?.message;
            setErrorMessage(
              typeof apiMessage === 'string' && apiMessage.trim()
                ? apiMessage
                : 'Ese celular ya está asociado a otra cuenta cliente activa.',
            );
          } else {
            setErrorMessage('No se pudo sumar el acceso cliente. Revisá el celular e intentá de nuevo.');
          }
        } else {
          setErrorMessage('No se pudo sumar el acceso cliente. Revisá el celular e intentá de nuevo.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (emailValue !== confirmEmailValue) {
      setErrorMessage('Los e-mails no coinciden.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (form.password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!passwordValid) {
      setErrorMessage('La contraseña no cumple los requisitos.');
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      password: form.password,
    };

    try {
      setIsSubmitting(true);
      await api.post('/auth/register/cliente', payload);
      await router.push({
        pathname: '/login',
        query: {
          intent: 'client',
          ...(redirectIntent === 'confirm-reservation' ? { redirect: 'confirm-reservation' } : {}),
          registered: '1',
          email: payload.email,
        },
      });
      return;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setErrorMessage('No se pudo conectar con el servidor.');
        } else {
          const status = error.response.status;
          const apiMessage = error.response.data?.message;
          if (status === 400) {
            setErrorMessage('Los datos ingresados no son válidos. Verificá el formulario.');
          } else if (status === 401) {
            setErrorMessage('Ya existe una cuenta con este email. Iniciá sesión para sumar el contexto cliente.');
          } else if (status === 409) {
            setErrorMessage(
              typeof apiMessage === 'string' && apiMessage.trim()
                ? apiMessage
                : 'Ya existe una cuenta cliente con estos datos. Iniciá sesión.',
            );
          } else if (status >= 500) {
            setErrorMessage('Error del servidor. Intentá de nuevo más tarde.');
          } else {
            setErrorMessage('No se pudo crear la cuenta. Verificá los datos e intentá de nuevo.');
          }
        }
      } else {
        setErrorMessage('No se pudo crear la cuenta. Verificá los datos e intentá de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <Card tone="default" padding="lg" className="w-full max-w-md space-y-6 rounded-[32px]">
          <div className="space-y-2">
            <Badge variant="warm">{isAddingClientContext ? 'Acceso cliente' : 'Registro'}</Badge>
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">
              {isAddingClientContext ? 'Sumar acceso cliente' : 'Crear cuenta'}
            </h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              {isAddingClientContext
                ? 'Solo necesitamos tu celular cliente para reservar con esta misma cuenta.'
                : 'Completá tus datos para comenzar en Plura.'}
            </p>
          </div>

          {!isAddingClientContext ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                  Registrate con
                </span>
                <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
              </div>
              <div className="space-y-2">
                <GoogleLoginButton
                  authAction="REGISTER"
                  intendedRole="USER"
                  onAuthenticated={handleOAuthAuthenticated}
                  onError={setErrorMessage}
                  buttonLabel="Continuar con Google"
                  loadingLabel="Registrando..."
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
              {isAddingClientContext ? 'Confirmá tus datos' : 'o con email'}
            </span>
            <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isAddingClientContext ? (
              isCheckingSession ? (
                <p className="rounded-[12px] border border-[color:var(--border-soft)] bg-white/80 px-3 py-2 text-xs text-[color:var(--ink-muted)]">
                  Validando sesión...
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--ink)]">Nombre</label>
                    <input
                      className={`${inputClassName} bg-[color:var(--surface-muted)]`}
                      placeholder="Sin nombre registrado"
                      name="fullName"
                      value={form.fullName}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--ink)]">E-Mail</label>
                    <input
                      className={`${inputClassName} bg-[color:var(--surface-muted)]`}
                      placeholder="nombre@dominio.com"
                      type="email"
                      name="email"
                      value={form.email}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[color:var(--ink)]">Celular cliente</label>
                    <InternationalPhoneField
                      value={form.phoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      required
                      selectClassName={inputClass('phoneNumber')}
                      inputClassName={inputClass('phoneNumber')}
                    />
                    <p className="text-xs text-[color:var(--ink-faint)]">
                      Seleccioná tu país y escribí el número sin el código internacional.
                    </p>
                    {touched.phoneNumber && validationErrors.phoneNumber ? (
                      <p className="text-xs text-red-600">{validationErrors.phoneNumber}</p>
                    ) : null}
                  </div>
                </>
              )
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Nombre completo</label>
                  <input
                    className={inputClass('fullName')}
                    placeholder="Tu nombre y apellido"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    minLength={3}
                  />
                  {touched.fullName && validationErrors.fullName ? (
                    <p className="text-xs text-red-600">{validationErrors.fullName}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">E-Mail</label>
                  <input
                    className={inputClass('email')}
                    placeholder="nombre@dominio.com"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {touched.email && validationErrors.email ? (
                    <p className="text-xs text-red-600">{validationErrors.email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Confirmar E-Mail</label>
                  <input
                    className={inputClass('confirmEmail')}
                    placeholder="nombre@dominio.com"
                    type="email"
                    name="confirmEmail"
                    value={form.confirmEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {showConfirmEmailError ? (
                    <p className="text-xs text-red-600">{validationErrors.confirmEmail}</p>
                  ) : null}
                  {emailsMatch ? (
                    <p className="text-xs font-medium text-emerald-600">Los e-mails coinciden.</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Celular</label>
                  <InternationalPhoneField
                    value={form.phoneNumber}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    required
                    selectClassName={inputClass('phoneNumber')}
                    inputClassName={inputClass('phoneNumber')}
                  />
                  <p className="text-xs text-[color:var(--ink-faint)]">
                    Seleccioná tu país y escribí el número sin el código internacional.
                  </p>
                  {touched.phoneNumber && validationErrors.phoneNumber ? (
                    <p className="text-xs text-red-600">{validationErrors.phoneNumber}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Contraseña</label>
                  <PasswordInput
                    className={inputClass('password')}
                    placeholder="••••••••"
                    name="password"
                    value={form.password}
                    isVisible={visiblePasswords.password}
                    onToggleVisibility={() =>
                      setVisiblePasswords((prev) => ({ ...prev, password: !prev.password }))
                    }
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    minLength={8}
                  />
                  <ul className="space-y-1 text-xs">
                    {passwordChecks.map((rule) => (
                      <li
                        key={rule.id}
                        className={rule.valid ? 'text-[color:var(--primary)]' : 'text-[color:var(--ink-faint)]'}
                      >
                        <span
                          className={`mr-2 inline-block h-2 w-2 rounded-full ${
                            rule.valid ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--border-strong)]'
                          }`}
                        />
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                  {touched.password && validationErrors.password ? (
                    <p className="text-xs text-red-600">{validationErrors.password}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--ink)]">Confirmar contraseña</label>
                  <PasswordInput
                    className={inputClass('confirmPassword')}
                    placeholder="••••••••"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    isVisible={visiblePasswords.confirmPassword}
                    onToggleVisibility={() =>
                      setVisiblePasswords((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    minLength={8}
                  />
                  {touched.confirmPassword && validationErrors.confirmPassword ? (
                    <p className="text-xs text-red-600">{validationErrors.confirmPassword}</p>
                  ) : null}
                </div>
              </>
            )}

            {errorMessage ? (
              <p className="rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-[12px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)] px-3 py-2 text-xs text-[color:var(--primary)]">
                {successMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={isSubmitting || isCheckingSession || !isFormValid}
              loading={isSubmitting}
              loadingLabel={isAddingClientContext ? 'Sumando acceso...' : 'Creando cuenta...'}
            >
              {isAddingClientContext ? 'Sumar acceso cliente' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-xs text-[color:var(--ink-muted)]">
            ¿Ya tenés cuenta?{' '}
            <Link
              href={loginHref}
              className="font-semibold text-[color:var(--accent-strong)]"
            >
              Iniciar sesión
            </Link>
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
