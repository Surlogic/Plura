'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import AppleLoginButton from '@/components/auth/AppleLoginButton';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/services/api';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';

export default function ClienteRegisterPage() {
  const router = useRouter();
  const { refreshProfile: refreshClientProfile } = useClientProfileContext();
  const { refreshProfile: refreshProfessionalProfile } = useProfessionalProfileContext();
  const redirectIntent = Array.isArray(router.query.redirect)
    ? router.query.redirect[0]
    : router.query.redirect;
  const loginHref = redirectIntent === 'confirm-reservation'
    ? '/cliente/auth/login?redirect=confirm-reservation'
    : '/cliente/auth/login';
  const inputClassName =
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/88 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    if (result.role === 'PROFESSIONAL') {
      await refreshProfessionalProfile();
      router.push('/profesional/dashboard');
      return;
    }
    await refreshClientProfile();
    router.push('/cliente/inicio');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const emailValue = form.email.trim().toLowerCase();
  const confirmEmailValue = form.confirmEmail.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRules: Array<{
    id: string;
    label: string;
    test: (value: string) => boolean;
  }> = [
    {
      id: 'length',
      label: 'Minimo 10 caracteres.',
      test: (value: string) => value.length >= 10,
    },
    {
      id: 'uppercase',
      label: 'Al menos 1 mayuscula.',
      test: (value: string) => /[A-Z]/.test(value),
    },
    {
      id: 'lowercase',
      label: 'Al menos 1 minuscula.',
      test: (value: string) => /[a-z]/.test(value),
    },
    {
      id: 'number',
      label: 'Al menos 1 numero.',
      test: (value: string) => /[0-9]/.test(value),
    },
  ];
  const passwordChecks = passwordRules.map((rule) => ({
    ...rule,
    valid: rule.test(form.password),
  }));
  const passwordValid = passwordChecks.every((rule) => rule.valid);
  const validationErrors = {
    fullName: form.fullName.trim().length >= 3 ? '' : 'Mínimo 3 caracteres.',
    email: emailPattern.test(emailValue) ? '' : 'Email inválido.',
    confirmEmail: confirmEmailValue.length > 0 && confirmEmailValue === emailValue
      ? ''
      : 'Los correos no coinciden.',
    phoneNumber: form.phoneNumber.trim().length >= 8 ? '' : 'Mínimo 8 dígitos.',
    password: passwordValid ? '' : 'La contraseña no cumple los requisitos.',
    confirmPassword: form.confirmPassword.length > 0 && form.confirmPassword === form.password
      ? ''
      : 'Las contraseñas no coinciden.',
  };
  const isFormValid = Object.values(validationErrors).every((value) => value === '');

  const inputClass = (field: keyof typeof validationErrors) =>
    `${inputClassName}${
      touched[field] && validationErrors[field] ? ' border-red-300 focus:ring-red-200' : ''
    }`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.email !== form.confirmEmail) {
      setErrorMessage('Los correos no coinciden.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (form.password.length < 10) {
      setErrorMessage('La contraseña debe tener al menos 10 caracteres.');
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
      setSuccessMessage('Cuenta creada. Ya podés iniciar sesión.');
      setForm({
        fullName: '',
        email: '',
        confirmEmail: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      });
      setTouched({
        fullName: false,
        email: false,
        confirmEmail: false,
        phoneNumber: false,
        password: false,
        confirmPassword: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setErrorMessage('No se pudo conectar con el servidor.');
        } else {
          const status = error.response.status;
          if (status === 409) {
            setErrorMessage('Ya existe una cuenta registrada con ese email.');
          } else if (status === 400) {
            setErrorMessage('Los datos ingresados no son válidos. Verificá el formulario.');
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
    <div className="min-h-screen bg-[radial-gradient(1100px_620px_at_5%_-10%,rgba(31,182,166,0.18),transparent_55%),radial-gradient(900px_700px_at_95%_0%,rgba(242,140,56,0.18),transparent_50%),linear-gradient(180deg,#f8fcfb_0%,#eef4f2_100%)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <Card tone="default" padding="lg" className="w-full max-w-md space-y-6 rounded-[32px]">
          <div className="space-y-2">
            <Badge variant="warm">Registro</Badge>
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">Crear cuenta</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Completá tus datos para comenzar en Plura.
            </p>
          </div>

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
                onAuthenticated={handleOAuthAuthenticated}
                onError={setErrorMessage}
              />
              <AppleLoginButton
                onAuthenticated={handleOAuthAuthenticated}
                onError={setErrorMessage}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
              o con email
            </span>
            <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Nombre completo</label>
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
              <label className="text-sm font-medium text-[#0E2A47]">Gmail</label>
              <input
                className={inputClass('email')}
                placeholder="tucorreo@gmail.com"
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
              <label className="text-sm font-medium text-[#0E2A47]">Confirmar Gmail</label>
              <input
                className={inputClass('confirmEmail')}
                placeholder="tucorreo@gmail.com"
                type="email"
                name="confirmEmail"
                value={form.confirmEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {touched.confirmEmail && validationErrors.confirmEmail ? (
                <p className="text-xs text-red-600">{validationErrors.confirmEmail}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Celular</label>
              <input
                className={inputClass('phoneNumber')}
                placeholder="Tu número de celular"
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {touched.phoneNumber && validationErrors.phoneNumber ? (
                <p className="text-xs text-red-600">{validationErrors.phoneNumber}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">Contraseña</label>
              <input
                type="password"
                className={inputClass('password')}
                placeholder="••••••••"
                name="password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                minLength={10}
              />
              <ul className="space-y-1 text-xs">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.id}
                    className={rule.valid ? 'text-emerald-600' : 'text-[#94A3B8]'}
                  >
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${
                        rule.valid ? 'bg-emerald-500' : 'bg-[#CBD5E1]'
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
              <label className="text-sm font-medium text-[#0E2A47]">Confirmar contraseña</label>
              <input
                type="password"
                className={inputClass('confirmPassword')}
                placeholder="••••••••"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                minLength={10}
              />
              {touched.confirmPassword && validationErrors.confirmPassword ? (
                <p className="text-xs text-red-600">{validationErrors.confirmPassword}</p>
              ) : null}
            </div>

            {errorMessage ? (
              <p className="rounded-[12px] bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-[12px] bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-full border border-transparent bg-[linear-gradient(135deg,var(--warm),var(--accent))] text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
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
