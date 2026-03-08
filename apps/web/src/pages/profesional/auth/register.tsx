'use client';

import { useMemo, useState } from 'react';
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
import { useCategories } from '@/hooks/useCategories';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '@/services/geo';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';

export default function ProfesionalRegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();

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
    'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/88 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[rgba(15,118,110,0.18)]';
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [form, setForm] = useState({
    fullName: '',
    categorySlugs: [] as string[],
    email: '',
    confirmEmail: '',
    phoneNumber: '',
    tipoCliente: 'LOCAL',
    country: '',
    city: '',
    fullAddress: '',
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
    country: false,
    city: false,
    fullAddress: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    if (result.role !== 'PROFESSIONAL') {
      setErrorMessage('No pudimos completar el alta profesional con esa cuenta. Intentá nuevamente desde este flujo.');
      return;
    }
    await refreshProfile();
    router.push('/profesional/dashboard');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setActiveGeoField(field);
    if (value.trim().length < 2) {
      setIsGeoSuggesting(false);
      setGeoSuggestions([]);
      return;
    }

    setIsGeoSuggesting(true);
    const suggestions = await getGeoLocationSuggestions(value);
    setGeoSuggestions(suggestions);
    setIsGeoSuggesting(false);
  };

  const applyGeoSuggestion = (suggestion: GeoLocationSuggestion) => {
    const country = (suggestion.country || '').trim();
    const city = (suggestion.city || '').trim();
    const fullAddress = (suggestion.fullAddress || '').trim();
    const composedLocation = [fullAddress, city, country].filter(Boolean).join(', ');
    setForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
    }));
    if (composedLocation) {
      setForm((prev) => ({ ...prev, location: composedLocation }));
    }
    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

  const requiresLocation = form.tipoCliente === 'LOCAL' || form.tipoCliente === 'A_DOMICILIO';
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
      label: 'Minimo 8 caracteres.',
      test: (value: string) => value.length >= 8,
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
    country: requiresLocation && form.country.trim().length === 0 ? 'Indicá el país.' : '',
    city: requiresLocation && form.city.trim().length === 0 ? 'Indicá la ciudad.' : '',
    fullAddress: requiresLocation && form.fullAddress.trim().length === 0
      ? 'Indicá la dirección completa.'
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

    if (form.password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!passwordValid) {
      setErrorMessage('La contraseña no cumple los requisitos.');
      return;
    }

    if (requiresLocation && (!form.country.trim() || !form.city.trim() || !form.fullAddress.trim())) {
      setErrorMessage('Completá país, ciudad y dirección completa.');
      return;
    }
    if (form.categorySlugs.length === 0) {
      setErrorMessage('Seleccioná al menos un rubro.');
      return;
    }

    const primaryCategoryName = categoryNameBySlug.get(form.categorySlugs[0]) || '';

    setIsSubmitting(true);
    try {
      const normalizedCountry = requiresLocation ? form.country.trim() : '';
      const normalizedCity = requiresLocation ? form.city.trim() : '';
      const normalizedFullAddress = requiresLocation ? form.fullAddress.trim() : '';
      const normalizedLocation = requiresLocation
        ? `${normalizedFullAddress}, ${normalizedCity}, ${normalizedCountry}`
        : '';
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
        country: normalizedCountry,
        city: normalizedCity,
        fullAddress: normalizedFullAddress,
        location: requiresLocation ? normalizedLocation : null,
        latitude: geocodedLocation?.latitude ?? null,
        longitude: geocodedLocation?.longitude ?? null,
        tipoCliente: form.tipoCliente,
        password: form.password,
      };

      await api.post<RegisterResponse>('/auth/register/profesional', payload);
      setSuccessMessage(
        'Si el email no estaba registrado, la cuenta fue creada. Si ya existía, podés iniciar sesión. Una vez dentro del dashboard vas a poder verificar el email con un código.',
      );
      setForm({
        fullName: '',
        categorySlugs: [],
        email: '',
        confirmEmail: '',
        phoneNumber: '',
        tipoCliente: 'LOCAL',
        country: '',
        city: '',
        fullAddress: '',
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
        country: false,
        city: false,
        fullAddress: false,
        password: false,
        confirmPassword: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setErrorMessage('No se pudo conectar con el servidor.');
        } else {
          const status = error.response.status;
          if (status === 400) {
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
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_15%_-10%,rgba(42,165,160,0.18),transparent_55%),radial-gradient(950px_650px_at_100%_0%,rgba(16,42,75,0.32),transparent_50%),linear-gradient(180deg,#091223_0%,#0A1424_100%)] text-[#E8EEF7]">
      <AuthTopBar tone="professional" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
        <Card tone="default" padding="lg" className="w-full max-w-md space-y-6 rounded-[32px] text-[color:var(--ink)]">
          <div className="space-y-2">
            <Badge variant="accent" className="border-[#0f766e]/20 bg-[#ecfdf5] text-[#0f766e]">Registro</Badge>
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">
              Registro profesional
            </h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Completá tus datos para gestionar tu negocio en Plura.
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
                authAction="REGISTER"
                intendedRole="PROFESSIONAL"
                onAuthenticated={handleOAuthAuthenticated}
                onError={setErrorMessage}
              />
              <AppleLoginButton
                authAction="REGISTER"
                intendedRole="PROFESSIONAL"
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
                <option value="A_DOMICILIO">A domicilio</option>
                <option value="SIN_LOCAL">Profesional sin local</option>
              </select>
            </div>

            {requiresLocation ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#0E2A47]">País</label>
                  <input
                    className={inputClass('country')}
                    placeholder="Ej: Argentina"
                    name="country"
                    value={form.country}
                    onChange={(event) => void handleGeoFieldChange('country', event.target.value)}
                    onBlur={handleBlur}
                    required={requiresLocation}
                  />
                  {activeGeoField === 'country' && geoSuggestions.length > 0 ? (
                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.fullAddress || 'suggestion'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyGeoSuggestion(item);
                          }}
                        >
                          {(item.country || item.city || item.fullAddress || item.placeName || '').trim()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {touched.country && validationErrors.country ? (
                    <p className="text-xs text-red-600">{validationErrors.country}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#0E2A47]">Ciudad</label>
                  <input
                    className={inputClass('city')}
                    placeholder="Ej: Buenos Aires"
                    name="city"
                    value={form.city}
                    onChange={(event) => void handleGeoFieldChange('city', event.target.value)}
                    onBlur={handleBlur}
                    required={requiresLocation}
                  />
                  {activeGeoField === 'city' && geoSuggestions.length > 0 ? (
                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.fullAddress || 'suggestion'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyGeoSuggestion(item);
                          }}
                        >
                          {(item.city || item.fullAddress || item.placeName || '').trim()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {touched.city && validationErrors.city ? (
                    <p className="text-xs text-red-600">{validationErrors.city}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#0E2A47]">Dirección completa</label>
                  <input
                    className={inputClass('fullAddress')}
                    placeholder="Ej: Av. Santa Fe 1234"
                    name="fullAddress"
                    value={form.fullAddress}
                    onChange={(event) => void handleGeoFieldChange('fullAddress', event.target.value)}
                    onBlur={handleBlur}
                    required={requiresLocation}
                  />
                  {activeGeoField === 'fullAddress' && (geoSuggestions.length > 0 || isGeoSuggesting) ? (
                    <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {isGeoSuggesting ? (
                        <p className="px-3 py-2 text-xs text-[#64748B]">Buscando sugerencias...</p>
                      ) : null}
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.fullAddress || 'suggestion'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyGeoSuggestion(item);
                          }}
                        >
                          <span className="block font-medium">
                            {(item.fullAddress || item.placeName || '').trim() || 'Dirección sugerida'}
                          </span>
                          <span className="block text-xs text-[#64748B]">
                            {[item.city, item.country].filter(Boolean).join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {touched.fullAddress && validationErrors.fullAddress ? (
                    <p className="text-xs text-red-600">{validationErrors.fullAddress}</p>
                  ) : null}
                </div>
              </>
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
                minLength={8}
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
                minLength={8}
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
              className="h-12 w-full rounded-full border border-transparent bg-[linear-gradient(135deg,#0f766e,#0e2a47)] text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-[color:var(--ink-muted)]">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/profesional/auth/login"
              className="font-semibold text-[#0f766e]"
            >
              Iniciar sesión profesional
            </Link>
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
