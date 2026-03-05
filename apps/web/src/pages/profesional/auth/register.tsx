'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import AppleLoginButton from '@/components/auth/AppleLoginButton';
import api from '@/services/api';
import { useCategories } from '@/hooks/useCategories';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';

export default function ProfesionalRegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();
  const { refreshProfile: refreshClientProfile } = useClientProfileContext();

  type RegisterResponse = {
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      createdAt: string;
    };
  };

  const inputClassName =
    'h-12 w-full rounded-[16px] border border-[#0E2A47]/10 bg-[#F4F6F8] px-4 text-sm text-[#0E2A47] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/40';
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [form, setForm] = useState({
    fullName: '',
    categorySlugs: [] as string[],
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    tipoCliente: 'LOCAL',
    location: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    fullName: false,
    categorySlugs: false,
    email: false,
    confirmEmail: false,
    phoneNumber: false,
    tipoCliente: false,
    location: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    if (result.role === 'PROFESSIONAL') {
      await refreshProfile();
      router.push('/profesional/dashboard');
      return;
    }
    await refreshClientProfile();
    router.push('/cliente/inicio');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'PROF';
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
    categorySlugs: form.categorySlugs.length > 0 ? '' : 'Seleccioná al menos un rubro.',
    email: emailPattern.test(emailValue) ? '' : 'Email inválido.',
    confirmEmail: confirmEmailValue.length > 0 && confirmEmailValue === emailValue
      ? ''
      : 'Los correos no coinciden.',
    phoneNumber: form.phoneNumber.trim().length >= 8 ? '' : 'Mínimo 8 dígitos.',
    tipoCliente: form.tipoCliente ? '' : 'Seleccioná un tipo.',
    location: requiresLocation && form.location.trim().length === 0
      ? 'Indicá la ubicación del local.'
      : '',
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
  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );

  const toggleCategory = (slug: string) => {
    setTouched((prev) => ({ ...prev, categorySlugs: true }));
    setForm((prev) => {
      const selected = prev.categorySlugs.includes(slug);
      return {
        ...prev,
        categorySlugs: selected
          ? prev.categorySlugs.filter((value) => value !== slug)
          : [...prev.categorySlugs, slug],
      };
    });
  };

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

    if (requiresLocation && !form.location.trim()) {
      setErrorMessage('Indicá la ubicación del local.');
      return;
    }
    if (form.categorySlugs.length === 0) {
      setErrorMessage('Seleccioná al menos un rubro.');
      return;
    }

    const primaryCategoryName = categoryNameBySlug.get(form.categorySlugs[0]) || '';

    setIsSubmitting(true);
    try {
      const normalizedLocation = requiresLocation ? form.location.trim() : '';
      const geocodedLocation = requiresLocation
        ? await mapboxForwardGeocode(normalizedLocation)
        : null;
      if (requiresLocation && !geocodedLocation) {
        setErrorMessage('No pudimos ubicar esa dirección. Revisala e intentá de nuevo.');
        return;
      }

      const payload = {
        fullName: form.fullName.trim(),
        rubro: primaryCategoryName,
        categorySlugs: form.categorySlugs,
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        location: requiresLocation ? normalizedLocation : null,
        latitude: geocodedLocation?.latitude ?? null,
        longitude: geocodedLocation?.longitude ?? null,
        tipoCliente: form.tipoCliente,
        password: form.password,
      };

      await api.post<RegisterResponse>('/auth/register/profesional', payload);
      setSuccessMessage('Cuenta profesional creada. Ya podés iniciar sesión.');
      setForm({
        fullName: '',
        categorySlugs: [],
        email: '',
        confirmEmail: '',
        phoneNumber: '',
        tipoCliente: 'LOCAL',
        location: '',
        password: '',
        confirmPassword: '',
      });
      setTouched({
        fullName: false,
        categorySlugs: false,
        email: false,
        confirmEmail: false,
        phoneNumber: false,
        tipoCliente: false,
        location: false,
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
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 rounded-[24px] bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#6B7280]">
              Registro
            </p>
            <h1 className="text-2xl font-semibold text-[#0E2A47]">
              Registro profesional
            </h1>
            <p className="text-sm text-[#6B7280]">
              Completá tus datos para gestionar tu negocio en Plura.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E2E8F0]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                Registrate con
              </span>
              <div className="h-px flex-1 bg-[#E2E8F0]" />
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
            <div className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
              o con email
            </span>
            <div className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#0E2A47]">
                Nombre o empresa
              </label>
              <input
                className={inputClass('fullName')}
                placeholder="Nombre del profesional o empresa"
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
              <label className="text-sm font-medium text-[#0E2A47]">Rubros</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => {
                  const checked = form.categorySlugs.includes(category.slug);
                  return (
                    <label
                      key={category.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-[12px] border px-3 py-2 text-sm transition ${
                        checked
                          ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                          : 'border-[#E2E7EC] bg-white text-[#334155] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#CBD5E1] text-[#1FB6A6] focus:ring-[#1FB6A6]/40"
                        checked={checked}
                        onChange={() => toggleCategory(category.slug)}
                      />
                      <span>{category.name}</span>
                    </label>
                  );
                })}
              </div>
              {categoriesLoading ? (
                <p className="text-xs text-[#6B7280]">Cargando rubros...</p>
              ) : null}
              {touched.categorySlugs && validationErrors.categorySlugs ? (
                <p className="text-xs text-red-600">{validationErrors.categorySlugs}</p>
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
              <label className="text-sm font-medium text-[#0E2A47]">Número</label>
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
              <label className="text-sm font-medium text-[#0E2A47]">
                Tipo de cliente
              </label>
              <select
                className={inputClass('tipoCliente')}
                name="tipoCliente"
                value={form.tipoCliente}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              >
                <option value="LOCAL">Local</option>
                <option value="PROF">Profesional con local</option>
                <option value="SIN_LOCAL">Profesional sin local</option>
              </select>
            </div>

            {requiresLocation ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0E2A47]">Ubicación</label>
                <input
                  className={inputClass('location')}
                  placeholder="Dirección o zona del local"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required={requiresLocation}
                />
                {touched.location && validationErrors.location ? (
                  <p className="text-xs text-red-600">{validationErrors.location}</p>
                ) : null}
              </div>
            ) : null}

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
              <label className="text-sm font-medium text-[#0E2A47]">
                Confirmar contraseña
              </label>
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
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,#1FB6A6,#0E2A47)] text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7280]">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/profesional/auth/login"
              className="font-semibold text-[#1FB6A6]"
            >
              Iniciar sesión profesional
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
