'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Marker } from 'react-map-gl/mapbox';
import axios from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import AuthLoadingOverlay from '@/components/auth/AuthLoadingOverlay';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import MapView from '@/components/map/MapView';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import api from '@/services/api';
import { useCategories } from '@/hooks/useCategories';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '@/services/geo';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import { getGoogleOAuthAppOrigin } from '@/lib/auth/googleOAuth';

const extractApiMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }

    if (responseData && typeof responseData === 'object') {
      const payload = responseData as {
        message?: unknown;
        detail?: unknown;
        error?: unknown;
      };

      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
      }
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim();
      }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
    }
  }

  return fallback;
};

type RegisterForm = {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  profileType: 'INDEPENDENT' | 'LOCAL';
  fullName: string;
  phoneNumber: string;
  description: string;
  categorySlugs: string[];
  tipoCliente: 'LOCAL' | 'A_DOMICILIO' | 'SIN_LOCAL';
  country: string;
  city: string;
  fullAddress: string;
  serviceName: string;
  serviceCategorySlug: string;
  serviceDuration: string;
  servicePrice: string;
  serviceDescription: string;
};

type TouchedState = Record<keyof RegisterForm, boolean>;

type ScheduleDay = {
  id: string;
  label: string;
  active: boolean;
  open: string;
  close: string;
};

type LocationPreview = {
  latitude: number;
  longitude: number;
  placeName: string;
};

type ProfessionalSchedulePayload = {
  days: Array<{
    day: string;
    enabled: boolean;
    paused: boolean;
    ranges: Array<{
      id: string;
      start: string;
      end: string;
    }>;
  }>;
  pauses: never[];
  slotDurationMinutes: number;
};

type ProfessionalServicePayload = {
  name: string;
  description: string;
  categorySlug: string;
  imageUrl: string;
  price: string;
  depositAmount: null;
  duration: string;
  postBufferMinutes: number;
  paymentType: 'ON_SITE';
  processingFeeMode: 'INSTANT';
  currency: 'UYU';
  active: boolean;
};

type ProfessionalRegisterHandoff = {
  schedule: ProfessionalSchedulePayload;
  firstService: ProfessionalServicePayload | null;
  publicPage: {
    about: string;
  };
};

const REGISTER_HANDOFF_KEY = 'plura:professional-register-handoff';

const wizardSteps = [
  'Cuenta',
  'Perfil',
  'Datos',
  'Rubros',
  'Atención',
  'Ubicación',
  'Horarios',
  'Servicio',
  'Preview',
] as const;

const initialSchedule: ScheduleDay[] = [
  { id: 'monday', label: 'Lunes', active: true, open: '09:00', close: '18:00' },
  { id: 'tuesday', label: 'Martes', active: true, open: '09:00', close: '18:00' },
  { id: 'wednesday', label: 'Miércoles', active: true, open: '09:00', close: '18:00' },
  { id: 'thursday', label: 'Jueves', active: true, open: '09:00', close: '18:00' },
  { id: 'friday', label: 'Viernes', active: true, open: '09:00', close: '18:00' },
  { id: 'saturday', label: 'Sábado', active: false, open: '09:00', close: '13:00' },
  { id: 'sunday', label: 'Domingo', active: false, open: '09:00', close: '13:00' },
];

const defaultTouched: TouchedState = {
  email: false,
  confirmEmail: false,
  password: false,
  confirmPassword: false,
  profileType: false,
  fullName: false,
  phoneNumber: false,
  description: false,
  categorySlugs: false,
  tipoCliente: false,
  country: false,
  city: false,
  fullAddress: false,
  serviceName: false,
  serviceCategorySlug: false,
  serviceDuration: false,
  servicePrice: false,
  serviceDescription: false,
};

const inputBaseClassName =
  'h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] shadow-[var(--shadow-card)] transition focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';
const textAreaClassName =
  'min-h-28 w-full resize-none rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] shadow-[var(--shadow-card)] transition focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

export default function ProfesionalRegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    profileType: 'INDEPENDENT',
    fullName: '',
    phoneNumber: '',
    description: '',
    categorySlugs: [],
    tipoCliente: 'SIN_LOCAL',
    country: 'Uruguay',
    city: 'Montevideo',
    fullAddress: '',
    serviceName: '',
    serviceCategorySlug: '',
    serviceDuration: '60',
    servicePrice: '',
    serviceDescription: '',
  });
  const [touched, setTouched] = useState<TouchedState>(defaultTouched);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule);
  const [isOAuthSetup, setIsOAuthSetup] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [locationPreview, setLocationPreview] = useState<LocationPreview | null>(null);
  const [isLocationPreviewLoading, setIsLocationPreviewLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isBusy = isSubmitting || isGoogleLoading;
  const visibleStepNumber = Math.min(step + 1, 8);

  const emailValue = form.email.trim().toLowerCase();
  const confirmEmailValue = form.confirmEmail.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const requiresLocation = form.tipoCliente === 'LOCAL';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const appOrigin = getGoogleOAuthAppOrigin();
    if (!appOrigin) return;
    const normalizedCurrentOrigin = window.location.origin.replace(/\/+$/, '');
    const normalizedAppOrigin = appOrigin.replace(/\/+$/, '');
    if (normalizedCurrentOrigin === normalizedAppOrigin) return;
    window.location.replace(`${normalizedAppOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }, []);

  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );

  const selectedCategoryNames = form.categorySlugs
    .map((slug) => categoryNameBySlug.get(slug))
    .filter(Boolean) as string[];
  const primaryCategoryName = selectedCategoryNames[0] || 'Estética Facial';
  const serviceCategoryName = categoryNameBySlug.get(form.serviceCategorySlug) || primaryCategoryName;
  const filteredCategories = categories.filter((category) => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return true;
    return category.name.toLowerCase().includes(query) || category.slug.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!requiresLocation) {
      setLocationPreview(null);
      setIsLocationPreviewLoading(false);
      return undefined;
    }

    const country = form.country.trim();
    const city = form.city.trim();
    const fullAddress = form.fullAddress.trim();

    if (!country || !city || fullAddress.length < 4) {
      setLocationPreview(null);
      setIsLocationPreviewLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLocationPreviewLoading(true);
      void mapboxForwardGeocode(`${fullAddress}, ${city}, ${country}`, controller.signal)
        .then((result) => {
          if (!result) {
            setLocationPreview(null);
            return;
          }
          setLocationPreview(result);
        })
        .finally(() => {
          setIsLocationPreviewLoading(false);
        });
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.country, form.city, form.fullAddress, requiresLocation]);

  const passwordValid = form.password.length >= 8;
  const validationErrors: Record<keyof RegisterForm, string> = {
    email: emailPattern.test(emailValue) ? '' : 'Email inválido.',
    confirmEmail: confirmEmailValue.length > 0 && confirmEmailValue === emailValue
      ? ''
      : 'Los correos no coinciden.',
    password: isOAuthSetup || passwordValid ? '' : 'Mínimo 8 caracteres.',
    confirmPassword: isOAuthSetup || (form.confirmPassword.length > 0 && form.confirmPassword === form.password)
      ? ''
      : 'Las contraseñas no coinciden.',
    profileType: form.profileType ? '' : 'Seleccioná un tipo de perfil.',
    fullName: form.fullName.trim().length >= 3 ? '' : 'Mínimo 3 caracteres.',
    phoneNumber: form.phoneNumber.replace(/\D/g, '').length >= 8 ? '' : 'Ingresá un número válido.',
    description: form.description.trim().length > 150 ? 'Máximo 150 caracteres.' : '',
    categorySlugs: form.categorySlugs.length > 0 ? '' : 'Seleccioná al menos un rubro.',
    tipoCliente: form.tipoCliente ? '' : 'Seleccioná una modalidad.',
    country: requiresLocation && form.country.trim().length === 0 ? 'Indicá el país.' : '',
    city: requiresLocation && form.city.trim().length === 0 ? 'Indicá la ciudad.' : '',
    fullAddress: requiresLocation && form.fullAddress.trim().length === 0
      ? 'Indicá la dirección completa.'
      : '',
    serviceName: form.serviceName.trim().length >= 3 ? '' : 'Indicá el nombre del servicio.',
    serviceCategorySlug: form.serviceCategorySlug || form.categorySlugs[0] ? '' : 'Elegí el rubro del servicio.',
    serviceDuration: Number(form.serviceDuration) > 0 ? '' : 'Indicá una duración válida.',
    servicePrice: form.servicePrice.trim().length > 0 ? '' : 'Indicá un precio.',
    serviceDescription: form.serviceDescription.trim().length > 180 ? 'Máximo 180 caracteres.' : '',
  };

  const inputClass = (field: keyof RegisterForm) =>
    `${inputBaseClassName}${touched[field] && validationErrors[field] ? ' border-red-300 focus:ring-red-200' : ''}`;
  const textAreaClass = (field: keyof RegisterForm) =>
    `${textAreaClassName}${touched[field] && validationErrors[field] ? ' border-red-300 focus:ring-red-200' : ''}`;

  const markTouched = (fields: Array<keyof RegisterForm>) => {
    setTouched((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const stepFields = (currentStep: number): Array<keyof RegisterForm> => {
    switch (currentStep) {
      case 0:
        return isOAuthSetup ? [] : ['email', 'confirmEmail', 'password', 'confirmPassword'];
      case 1:
        return ['profileType'];
      case 2:
        return ['fullName', 'phoneNumber', 'description'];
      case 3:
        return ['categorySlugs'];
      case 4:
        return ['tipoCliente'];
      case 5:
        return requiresLocation ? ['country', 'city', 'fullAddress'] : [];
      case 7:
        return ['serviceName', 'serviceCategorySlug', 'serviceDuration', 'servicePrice', 'serviceDescription'];
      default:
        return [];
    }
  };

  const currentStepIsValid = (currentStep: number) => {
    const fields = stepFields(currentStep);
    return fields.every((field) => validationErrors[field] === '');
  };

  const setField = <K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const normalizedValue = name === 'email' || name === 'confirmEmail' ? value.toLowerCase() : value;
    setForm((prev) => ({ ...prev, [name]: normalizedValue }));
    setSuccessMessage(null);
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handlePhoneChange = (nextPhoneNumber: string) => {
    setForm((prev) => ({ ...prev, phoneNumber: nextPhoneNumber }));
  };

  const handlePhoneBlur = () => {
    setTouched((prev) => ({ ...prev, phoneNumber: true }));
  };

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (result.role !== 'PROFESSIONAL') {
      setIsGoogleLoading(false);
      setErrorMessage('No pudimos completar el alta profesional con esa cuenta. Intentá nuevamente desde este flujo.');
      return;
    }

    const oauthEmail = result.user.email?.trim().toLowerCase() || '';
    const oauthPhoneNumber = (result.user.phoneNumber ?? '').trim();

    setIsOAuthSetup(true);
    setForm((prev) => ({
      ...prev,
      fullName: result.user.fullName?.trim() || prev.fullName,
      email: oauthEmail || prev.email,
      confirmEmail: oauthEmail || prev.confirmEmail,
      phoneNumber: oauthPhoneNumber || prev.phoneNumber,
      password: '',
      confirmPassword: '',
    }));
    setTouched((prev) => ({
      ...prev,
      email: Boolean(oauthEmail),
      confirmEmail: Boolean(oauthEmail),
      phoneNumber: Boolean(oauthPhoneNumber),
      password: true,
      confirmPassword: true,
    }));
    setIsGoogleLoading(false);
    setStep(1);
    setSuccessMessage(
      oauthPhoneNumber
        ? 'Cuenta conectada con Google. Continuá el mismo registro profesional.'
        : 'Cuenta conectada con Google. El teléfono se completa en el paso de datos básicos.',
    );
    void refreshProfile().catch(() => undefined);
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
    setForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
    }));

    if (
      typeof suggestion.latitude === 'number'
      && Number.isFinite(suggestion.latitude)
      && typeof suggestion.longitude === 'number'
      && Number.isFinite(suggestion.longitude)
    ) {
      setLocationPreview({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        placeName: (suggestion.placeName || suggestion.fullAddress || fullAddress || city || country || '').trim(),
      });
    }

    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

  const chooseProfileType = (profileType: RegisterForm['profileType']) => {
    setForm((prev) => ({
      ...prev,
      profileType,
      tipoCliente: profileType === 'LOCAL' ? 'LOCAL' : 'SIN_LOCAL',
    }));
    setTouched((prev) => ({ ...prev, profileType: true, tipoCliente: true }));
  };

  const toggleCategory = (slug: string) => {
    setTouched((prev) => ({ ...prev, categorySlugs: true }));
    setForm((prev) => {
      const selected = prev.categorySlugs.includes(slug);
      if (!selected && prev.categorySlugs.length >= 5) {
        return prev;
      }
      const nextSlugs = selected
        ? prev.categorySlugs.filter((value) => value !== slug)
        : [...prev.categorySlugs, slug];
      return {
        ...prev,
        categorySlugs: nextSlugs,
        serviceCategorySlug: prev.serviceCategorySlug || nextSlugs[0] || '',
      };
    });
  };

  const updateScheduleDay = (id: string, patch: Partial<ScheduleDay>) => {
    setSchedule((prev) => prev.map((day) => (day.id === id ? { ...day, ...patch } : day)));
  };

  const applyWeekSchedule = () => {
    setSchedule((prev) => prev.map((day) => ({
      ...day,
      active: day.id !== 'sunday',
      open: '09:00',
      close: day.id === 'saturday' ? '13:00' : '18:00',
    })));
  };

  const buildSchedulePayload = (): ProfessionalSchedulePayload => ({
    days: schedule.map((day) => ({
      day: day.id,
      enabled: day.active,
      paused: false,
      ranges: day.active
        ? [{
          id: `${day.id}-main`,
          start: day.open,
          end: day.close,
        }]
        : [],
    })),
    pauses: [],
    slotDurationMinutes: Math.max(15, Number(form.serviceDuration) || 60),
  });

  const buildFirstServicePayload = (): ProfessionalServicePayload | null => {
    const name = form.serviceName.trim();
    const price = form.servicePrice.trim();
    const duration = form.serviceDuration.trim();

    if (!name || !price || !duration) return null;

    return {
      name,
      description: form.serviceDescription.trim(),
      categorySlug: form.serviceCategorySlug || form.categorySlugs[0] || '',
      imageUrl: '',
      price,
      depositAmount: null,
      duration,
      postBufferMinutes: 0,
      paymentType: 'ON_SITE',
      processingFeeMode: 'INSTANT',
      currency: 'UYU',
      active: true,
    };
  };

  const buildRegisterHandoff = (): ProfessionalRegisterHandoff => ({
    schedule: buildSchedulePayload(),
    firstService: buildFirstServicePayload(),
    publicPage: {
      about: form.description.trim(),
    },
  });

  const applyRegisterHandoff = async (handoff: ProfessionalRegisterHandoff) => {
    if (handoff.publicPage.about) {
      await api.put('/profesional/public-page', {
        about: handoff.publicPage.about,
      });
    }

    await api.put('/profesional/schedule', handoff.schedule);

    if (handoff.firstService) {
      await api.post('/profesional/services', handoff.firstService);
    }
  };

  const goNext = () => {
    setErrorMessage(null);
    const fields = stepFields(step);
    markTouched(fields);
    if (!currentStepIsValid(step)) {
      setErrorMessage('Revisá los datos marcados para continuar.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const goBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const saveDraftAfterRegister = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      REGISTER_HANDOFF_KEY,
      JSON.stringify(buildRegisterHandoff()),
    );
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage(null);
    const allFields = Object.keys(validationErrors) as Array<keyof RegisterForm>;
    markTouched(allFields);

    const blockingFields = allFields.filter((field) => validationErrors[field] !== '');
    if (blockingFields.length > 0) {
      setErrorMessage('Faltan datos obligatorios para publicar el perfil.');
      return;
    }

    const primaryRubro = categoryNameBySlug.get(form.categorySlugs[0]) || '';
    const normalizedEmail = form.email.trim().toLowerCase();
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
        rubro: primaryRubro,
        categorySlugs: form.categorySlugs,
        email: normalizedEmail,
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

      if (isOAuthSetup) {
        await api.post('/auth/oauth/complete-phone', {
          phoneNumber: payload.phoneNumber,
        });

        try {
          await api.put('/profesional/profile', {
            fullName: payload.fullName,
            rubro: payload.rubro,
            categorySlugs: payload.categorySlugs,
            location: payload.location || '',
            country: payload.country,
            city: payload.city,
            fullAddress: payload.fullAddress,
            latitude: payload.latitude,
            longitude: payload.longitude,
            phoneNumber: payload.phoneNumber,
          });
        } catch {
          // No cortamos el onboarding si el backend rechaza una actualizacion parcial.
          // El telefono queda guardado y el draft conserva horarios/primer servicio para el dashboard.
        }

        const handoff = buildRegisterHandoff();
        saveDraftAfterRegister();
        try {
          await applyRegisterHandoff(handoff);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(REGISTER_HANDOFF_KEY);
          }
        } catch {
          setErrorMessage('La cuenta quedó conectada, pero no pudimos cargar toda la configuración inicial. Revisá conexión y volvé a intentar.');
          return;
        }

        await refreshProfile();
        await router.push('/profesional/dashboard');
        return;
      }

      await api.post('/auth/register/profesional', payload);
      saveDraftAfterRegister();
      await router.push({
        pathname: '/profesional/auth/login',
        query: {
          email: normalizedEmail,
          registered: '1',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        setErrorMessage('No se pudo conectar con el servidor.');
      } else {
        const apiMessage = extractApiMessage(error, 'No se pudo crear la cuenta profesional.');
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const looksLikeExistingAccount =
          status === 409 ||
          /existe|registrad|already|duplicad|email/i.test(apiMessage);

        if (!isOAuthSetup && looksLikeExistingAccount) {
          await router.push({
            pathname: '/profesional/auth/login',
            query: {
              email: normalizedEmail,
              reason: 'existing-account',
            },
          });
          return;
        }

        setErrorMessage(apiMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: keyof RegisterForm) => (
    touched[field] && validationErrors[field] ? (
      <p className="text-xs text-red-600">{validationErrors[field]}</p>
    ) : null
  );

  const stepHeader = (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
      <span className="text-sm font-semibold text-[color:var(--ink)]">
        {step >= 8 ? 'Listo para publicar' : `Paso ${visibleStepNumber} de 8`}
      </span>
      <div className="flex items-center gap-3" aria-label="Progreso del registro profesional">
        {wizardSteps.slice(0, 8).map((item, index) => (
          <span
            key={item}
            className={`h-2.5 w-2.5 rounded-full border transition ${
              index <= Math.min(step, 7)
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)]'
                : 'border-[color:var(--border-strong)] bg-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );

  const ProfilePreviewCard = ({ compact = false }: { compact?: boolean }) => (
    <div className="overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-lift)]">
      <div className="h-36 bg-[linear-gradient(135deg,rgba(223,196,161,0.72),rgba(255,250,244,0.9)),radial-gradient(circle_at_80%_20%,rgba(10,122,67,0.16),transparent_30%)]" />
      <div className="relative space-y-4 px-6 pb-6 pt-12">
        <div className="absolute -top-12 left-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[color:var(--surface-strong)] bg-[color:var(--surface-soft)] text-center text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--primary)] shadow-[var(--shadow-card)]">
          {(form.fullName.trim() || 'EB')
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('') || 'EB'}
        </div>
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
            {form.fullName.trim() || 'Estudio Belleza'}
          </h3>
          <p className="text-sm text-[color:var(--ink-muted)]">
            {primaryCategoryName} · {requiresLocation ? form.city || 'Montevideo' : 'Atención flexible'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-[color:var(--ink)]">4.9</span>
          <span className="text-amber-500">★★★★★</span>
          <span className="text-[color:var(--ink-muted)]">(126 reseñas)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(selectedCategoryNames.length ? selectedCategoryNames : ['Estética Facial', 'Masajes', 'Depilación'])
            .slice(0, compact ? 3 : 5)
            .map((name) => (
              <span key={name} className="rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs text-[color:var(--ink-muted)]">
                {name}
              </span>
            ))}
        </div>
        {!compact ? (
          <div className="space-y-2 border-t border-[color:var(--border-soft)] pt-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Sobre mí</p>
            <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
              {form.description.trim() || 'Ofrecemos tratamientos personalizados para que te sientas bien, por dentro y por fuera.'}
            </p>
          </div>
        ) : null}
        <Button type="button" variant="primary" className="w-full">
          Reservar
        </Button>
      </div>
    </div>
  );

  const renderAccountStep = () => (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-start">
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="success">Registro</Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
            Creá tu cuenta profesional
          </h1>
          <p className="max-w-xl text-base text-[color:var(--ink-muted)]">
            Empezá a configurar tu perfil para recibir reservas en Plura.
          </p>
        </div>
        <GoogleLoginButton
          authAction="REGISTER"
          intendedRole="PROFESSIONAL"
          mode="redirect"
          onAuthenticated={handleOAuthAuthenticated}
          onError={(message) => {
            setIsGoogleLoading(false);
            setErrorMessage(message);
          }}
          buttonLabel="Continuar con Google"
          loadingLabel="Registrando..."
          onLoadingChange={setIsGoogleLoading}
        />
        {isOAuthSetup ? (
          <div className="rounded-[24px] border border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] p-5 text-sm text-[color:var(--primary-strong)]">
            <p className="font-semibold">Cuenta Google conectada</p>
            <p className="mt-1 text-[color:var(--ink-muted)]">
              {form.email || 'Tu cuenta de Google'} quedó asociada al registro. Continuá con el mismo wizard: tipo de perfil, datos básicos, teléfono, rubros y publicación.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">o con email</span>
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--ink)]">Email</label>
                <input
                  className={inputClass('email')}
                  placeholder="tucorreo@gmail.com"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {renderError('email')}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[color:var(--ink)]">Confirmar email</label>
                <input
                  className={inputClass('confirmEmail')}
                  placeholder="tucorreo@gmail.com"
                  type="email"
                  name="confirmEmail"
                  value={form.confirmEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {renderError('confirmEmail')}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--ink)]">Contraseña</label>
                  <input
                    className={inputClass('password')}
                    placeholder="mínimo 8 caracteres"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {renderError('password')}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--ink)]">Confirmar contraseña</label>
                  <input
                    className={inputClass('confirmPassword')}
                    placeholder="repetir contraseña"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {renderError('confirmPassword')}
                </div>
              </div>
            </div>
          </>
        )}
        <p className="text-center text-sm text-[color:var(--ink-muted)]">
          ¿Ya tenés cuenta?{' '}
          <Link href="/profesional/auth/login" className="font-semibold text-[color:var(--primary)]">
            Iniciar sesión profesional
          </Link>
        </p>
      </div>
      <div className="space-y-4">
        <h2 className="text-center text-xl font-semibold text-[color:var(--ink)]">Así te verán tus clientes</h2>
        <ProfilePreviewCard />
        <p className="text-center text-xs text-[color:var(--ink-faint)]">Este es un ejemplo de cómo se verá tu perfil público.</p>
      </div>
    </div>
  );

  const renderTypeStep = () => (
    <div className="space-y-10 text-center">
      <div className="space-y-3">
        <Badge variant="success">Registro</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">¿Cómo trabajás?</h1>
        <p className="text-base text-[color:var(--ink-muted)]">
          Esto solo configura tu perfil y modalidad de atención; no cambia tu suscripción.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          {
            id: 'INDEPENDENT' as const,
            title: 'Profesional independiente',
            description: 'Atendés de forma independiente y gestionás tu propia agenda.',
            icon: '👤',
          },
          {
            id: 'LOCAL' as const,
            title: 'Tengo local físico',
            description: 'Tenés un espacio físico donde recibís a tus clientes.',
            icon: '🏪',
          },
        ].map((option) => {
          const selected = form.profileType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseProfileType(option.id)}
              className={`relative min-h-64 rounded-[32px] border p-8 text-center transition hover:-translate-y-0.5 ${
                selected
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] shadow-[var(--shadow-lift)]'
                  : 'border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-card)]'
              }`}
            >
              {selected ? (
                <span className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-white">✓</span>
              ) : null}
              <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--surface-soft)] text-5xl shadow-[var(--shadow-card)]">
                {option.icon}
              </span>
              <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">{option.title}</h2>
              <p className="mx-auto mt-3 max-w-xs text-base leading-7 text-[color:var(--ink-muted)]">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-center">
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="success">Perfil</Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Contanos cómo querés aparecer en Plura</h1>
          <p className="text-base text-[color:var(--ink-muted)]">Estos datos se verán en tu perfil público.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--ink)]">Nombre profesional o del negocio</label>
            <input
              className={inputClass('fullName')}
              placeholder="Estudio Belleza"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {renderError('fullName')}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--ink)]">Teléfono de contacto <span className="text-[color:var(--error)]">*</span></label>
            <InternationalPhoneField
              value={form.phoneNumber}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              selectClassName={inputClass('phoneNumber')}
              inputClassName={inputClass('phoneNumber')}
              inputPlaceholder="91 234 567"
            />
            {renderError('phoneNumber')}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--ink)]">Descripción corta</label>
            <textarea
              className={textAreaClass('description')}
              placeholder="Tratamientos faciales, depilación y masajes en un espacio cálido y profesional."
              name="description"
              value={form.description}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={150}
            />
            <p className="text-right text-xs text-[color:var(--ink-faint)]">{form.description.length}/150</p>
            {renderError('description')}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-center text-xl font-semibold text-[color:var(--ink)]">Vista previa</h2>
        <ProfilePreviewCard compact />
      </div>
    </div>
  );

  const renderCategoriesStep = () => (
    <div className="mx-auto max-w-5xl space-y-8 text-center">
      <div className="space-y-3">
        <Badge variant="success">Registro</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Elegí tus rubros principales</h1>
        <p className="text-base text-[color:var(--ink-muted)]">Seleccioná hasta 5 rubros. Después vas a poder cambiarlos.</p>
      </div>
      <input
        className={inputBaseClassName}
        placeholder="Buscar rubro..."
        value={categorySearch}
        onChange={(event) => setCategorySearch(event.target.value)}
      />
      <div className="text-left">
        <p className="mb-3 text-sm font-semibold text-[color:var(--ink)]">Seleccionados</p>
        <div className="flex min-h-12 flex-wrap gap-3">
          {selectedCategoryNames.length > 0 ? selectedCategoryNames.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleCategory(form.categorySlugs[index])}
              className="rounded-full border border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--primary)]"
            >
              {name} ×
            </button>
          )) : (
            <span className="text-sm text-[color:var(--ink-faint)]">Todavía no seleccionaste rubros.</span>
          )}
        </div>
        {renderError('categorySlugs')}
      </div>
      <div className="border-t border-[color:var(--border-soft)] pt-6">
        {categoriesLoading ? (
          <p className="text-sm text-[color:var(--ink-muted)]">Cargando rubros...</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredCategories.map((category) => {
            const selected = form.categorySlugs.includes(category.slug);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.slug)}
                className={`rounded-[18px] border px-4 py-4 text-sm font-semibold transition hover:-translate-y-0.5 ${
                  selected
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)] shadow-[var(--shadow-card)]'
                    : 'border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] text-[color:var(--ink)] hover:bg-[color:var(--surface-soft)]'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const LocationMapFallback = () => (
    <div className="relative h-full w-full bg-[linear-gradient(45deg,rgba(15,23,42,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(15,23,42,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(15,23,42,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(15,23,42,0.08)_75%)] bg-[length:42px_42px] bg-[position:0_0,0_21px,21px_-21px,-21px_0]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(10,122,67,0.18),transparent_28%)]" />
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color:var(--primary)] text-4xl text-white shadow-[var(--shadow-lift)]">⌖</div>
      <div className="absolute bottom-6 left-6 right-6 rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <p className="font-semibold text-[color:var(--ink)]">Ubicación del perfil</p>
        <p className="text-sm text-[color:var(--ink-muted)]">
          {isLocationPreviewLoading
            ? 'Buscando la dirección...'
            : locationPreview?.placeName || 'Ingresá una dirección para previsualizar el mapa.'}
        </p>
      </div>
    </div>
  );

  const renderModalityStep = () => (
    <div className="mx-auto max-w-5xl space-y-8 text-center">
      <div className="space-y-3">
        <Badge variant="success">Registro</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">¿Cómo atendés a tus clientes?</h1>
        <p className="text-base text-[color:var(--ink-muted)]">Elegí la modalidad principal. Después vas a poder cambiarla.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { id: 'LOCAL' as const, title: 'En mi local', description: 'Los clientes van a una dirección física.', icon: '🏪' },
          { id: 'A_DOMICILIO' as const, title: 'A domicilio', description: 'Vos vas a la ubicación del cliente.', icon: '🏠' },
          { id: 'SIN_LOCAL' as const, title: 'Sin local fijo', description: 'Atendés online, en espacios alquilados o coordinás por zona.', icon: '💻' },
        ].map((option) => {
          const selected = form.tipoCliente === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setField('tipoCliente', option.id)}
              className={`relative rounded-[28px] border p-7 text-center transition hover:-translate-y-0.5 ${
                selected
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] shadow-[var(--shadow-lift)]'
                  : 'border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-card)]'
              }`}
            >
              {selected ? <span className="absolute right-5 top-5 rounded-full bg-[color:var(--primary)] px-2 py-1 text-xs text-white">✓</span> : null}
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--surface-soft)] text-4xl">{option.icon}</span>
              <h2 className="mt-5 text-xl font-semibold text-[color:var(--ink)]">{option.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-muted)]">{option.description}</p>
            </button>
          );
        })}
      </div>
      {form.tipoCliente !== 'LOCAL' ? (
        <p className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--ink-muted)]">
          Para esta modalidad no pedimos dirección pública ahora. Podés completarla luego desde el dashboard.
        </p>
      ) : null}
    </div>
  );

  const renderLocationStep = () => {
    if (!requiresLocation) {
      return (
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Badge variant="success">Ubicación</Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Ubicación no obligatoria</h1>
          <p className="text-base leading-7 text-[color:var(--ink-muted)]">
            Como elegiste una modalidad sin local fijo, podés avanzar ahora y completar zonas de cobertura más adelante desde el dashboard.
          </p>
          <div className="rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-8 text-left shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Cómo se verá</p>
            <p className="mt-2 text-sm text-[color:var(--ink-muted)]">Tu perfil mostrará atención flexible hasta que configures una ubicación o zonas de cobertura.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <Badge variant="success">Registro</Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">¿Dónde atendés?</h1>
            <p className="text-base text-[color:var(--ink-muted)]">Ingresá la ubicación de tu local.</p>
          </div>
          <div className="space-y-4">
            {(['country', 'city', 'fullAddress'] as const).map((field) => (
              <div key={field} className="relative space-y-2">
                <label className="text-sm font-semibold text-[color:var(--ink)]">
                  {field === 'country' ? 'País' : field === 'city' ? 'Ciudad' : 'Dirección completa'}
                </label>
                <input
                  className={inputClass(field)}
                  placeholder={field === 'country' ? 'Uruguay' : field === 'city' ? 'Montevideo' : 'Av. Italia 1234'}
                  name={field}
                  value={form[field]}
                  onChange={(event) => void handleGeoFieldChange(field, event.target.value)}
                  onBlur={handleBlur}
                />
                {activeGeoField === field && (geoSuggestions.length > 0 || isGeoSuggesting) ? (
                  <div className="absolute z-20 mt-2 max-h-52 w-full overflow-auto rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-lift)]">
                    {isGeoSuggesting ? <p className="px-4 py-3 text-xs text-[color:var(--ink-muted)]">Buscando sugerencias...</p> : null}
                    {geoSuggestions.map((item, index) => (
                      <button
                        key={`${item.placeName || item.fullAddress || 'suggestion'}-${index}`}
                        type="button"
                        className="block w-full border-b border-[color:var(--border-soft)] px-4 py-3 text-left text-sm text-[color:var(--ink)] last:border-b-0 hover:bg-[color:var(--surface-soft)]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyGeoSuggestion(item)}
                      >
                        <span className="block font-semibold">{(item.fullAddress || item.city || item.country || item.placeName || '').trim()}</span>
                        <span className="block text-xs text-[color:var(--ink-muted)]">{[item.city, item.country].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {renderError(field)}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-lift)]">
          <div className="relative h-96">
            {locationPreview ? (
              <MapView
                initialViewState={{
                  latitude: locationPreview.latitude,
                  longitude: locationPreview.longitude,
                  zoom: 15,
                }}
                longitude={locationPreview.longitude}
                latitude={locationPreview.latitude}
                zoom={15}
                dragPan={false}
                scrollZoom={false}
                doubleClickZoom={false}
                touchZoomRotate={false}
                attributionControl={false}
                cooperativeGestures={false}
                reuseMaps
                resetKey={`${locationPreview.latitude}-${locationPreview.longitude}`}
                fallbackMessage="Falta NEXT_PUBLIC_MAPBOX_TOKEN para mostrar el mapa."
                webglFallbackNode={<LocationMapFallback />}
              >
                <Marker
                  latitude={locationPreview.latitude}
                  longitude={locationPreview.longitude}
                  anchor="center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--primary)] text-3xl text-white shadow-[var(--shadow-lift)]">
                    ⌖
                  </div>
                </Marker>
              </MapView>
            ) : (
              <LocationMapFallback />
            )}
            {locationPreview ? (
              <div className="pointer-events-none absolute bottom-6 left-6 right-6 rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)] backdrop-blur">
                <p className="font-semibold text-[color:var(--ink)]">Ubicación del perfil</p>
                <p className="text-sm text-[color:var(--ink-muted)]">
                  {isLocationPreviewLoading ? 'Actualizando mapa...' : locationPreview.placeName || 'Así verán tu local tus clientes.'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleStep = () => (
    <div className="mx-auto max-w-5xl space-y-7 text-center">
      <div className="space-y-3">
        <Badge variant="success">Registro</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Definí tus horarios de atención</h1>
        <p className="text-base text-[color:var(--ink-muted)]">Estos horarios se usarán como base inicial de tu agenda.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="secondary" onClick={applyWeekSchedule}>Aplicar horario a todos</Button>
        <Button type="button" variant="secondary">Agregar descanso</Button>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] text-left shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-[1.3fr_0.8fr_1fr_1fr] gap-4 border-b border-[color:var(--border-soft)] px-6 py-4 text-sm font-semibold text-[color:var(--ink-muted)]">
          <span>Día</span>
          <span>Activo</span>
          <span>Apertura</span>
          <span>Cierre</span>
        </div>
        {schedule.map((day) => (
          <div key={day.id} className="grid grid-cols-[1.3fr_0.8fr_1fr_1fr] items-center gap-4 border-b border-[color:var(--border-soft)] px-6 py-3 last:border-b-0">
            <span className="font-semibold text-[color:var(--ink)]">{day.label}</span>
            <button
              type="button"
              onClick={() => updateScheduleDay(day.id, { active: !day.active })}
              className={`h-7 w-12 rounded-full p-1 transition ${day.active ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--border-strong)]'}`}
              aria-label={`Activar ${day.label}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition ${day.active ? 'translate-x-5' : ''}`} />
            </button>
            {day.active ? (
              <input
                type="time"
                className="h-10 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-3 text-sm text-[color:var(--ink)]"
                value={day.open}
                onChange={(event) => updateScheduleDay(day.id, { open: event.target.value })}
              />
            ) : <span className="text-sm text-[color:var(--ink-faint)]">—</span>}
            {day.active ? (
              <input
                type="time"
                className="h-10 rounded-[14px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-3 text-sm text-[color:var(--ink)]"
                value={day.close}
                onChange={(event) => updateScheduleDay(day.id, { close: event.target.value })}
              />
            ) : <span className="text-sm text-[color:var(--ink-faint)]">Cerrado</span>}
          </div>
        ))}
      </div>
      <p className="text-left text-sm text-[color:var(--ink-muted)]">Sin horarios, los clientes no podrán reservar automáticamente.</p>
    </div>
  );

  const renderServiceStep = () => (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-start">
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="success">Registro</Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Agregá tu primer servicio</h1>
          <p className="text-base text-[color:var(--ink-muted)]">Los clientes van a reservar a partir de tus servicios publicados.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--ink)]">Nombre del servicio</label>
            <input className={inputClass('serviceName')} name="serviceName" value={form.serviceName} onChange={handleChange} onBlur={handleBlur} placeholder="Limpieza facial profunda" />
            {renderError('serviceName')}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--ink)]">Rubro</label>
              <select className={inputClass('serviceCategorySlug')} name="serviceCategorySlug" value={form.serviceCategorySlug || form.categorySlugs[0] || ''} onChange={handleChange} onBlur={handleBlur}>
                <option value="">Elegir</option>
                {form.categorySlugs.map((slug) => (
                  <option key={slug} value={slug}>{categoryNameBySlug.get(slug) || slug}</option>
                ))}
              </select>
              {renderError('serviceCategorySlug')}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--ink)]">Duración</label>
              <select className={inputClass('serviceDuration')} name="serviceDuration" value={form.serviceDuration} onChange={handleChange} onBlur={handleBlur}>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
                <option value="90">90 minutos</option>
                <option value="120">120 minutos</option>
              </select>
              {renderError('serviceDuration')}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--ink)]">Precio</label>
              <input className={inputClass('servicePrice')} name="servicePrice" value={form.servicePrice} onChange={handleChange} onBlur={handleBlur} placeholder="$1.200" />
              {renderError('servicePrice')}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--ink)]">Descripción opcional</label>
            <textarea className={textAreaClass('serviceDescription')} name="serviceDescription" value={form.serviceDescription} onChange={handleChange} onBlur={handleBlur} placeholder="Tratamiento facial para limpiar, hidratar y revitalizar la piel." />
            {renderError('serviceDescription')}
          </div>
          <button type="button" className="w-full rounded-[18px] border border-dashed border-[color:var(--border-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--ink-muted)]">
            + Agregar otro servicio
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-center text-xl font-semibold text-[color:var(--ink)]">Vista previa del servicio</h2>
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-lift)]">
          <div className="h-56 bg-[linear-gradient(135deg,rgba(223,196,161,0.72),rgba(255,250,244,0.9)),radial-gradient(circle_at_25%_25%,rgba(10,122,67,0.16),transparent_30%)]" />
          <div className="space-y-4 p-6">
            <span className="inline-flex rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--primary)]">Destacado</span>
            <h3 className="text-2xl font-semibold text-[color:var(--ink)]">{form.serviceName || 'Limpieza facial profunda'}</h3>
            <p className="text-sm text-[color:var(--ink-muted)]">{form.serviceDuration || 60} minutos · {serviceCategoryName}</p>
            <p className="text-2xl font-semibold text-[color:var(--ink)]">{form.servicePrice || '$1.200'}</p>
            <p className="border-t border-[color:var(--border-soft)] pt-4 text-sm leading-6 text-[color:var(--ink-muted)]">
              {form.serviceDescription || 'Tratamiento facial para limpiar, hidratar y revitalizar la piel.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="mx-auto max-w-5xl space-y-8 text-center">
      <div className="space-y-3">
        <Badge variant="success">Listo para publicar</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">Revisá tu perfil antes de publicarlo</h1>
        <p className="text-base text-[color:var(--ink-muted)]">Así se va a ver tu perfil público en Plura.</p>
      </div>
      <div className="mx-auto max-w-3xl">
        <ProfilePreviewCard />
      </div>
      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5 text-left">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Primer servicio</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{form.serviceName}</p>
          <p className="text-sm text-[color:var(--ink-muted)]">{form.serviceDuration} min · {form.servicePrice}</p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5 text-left">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Agenda inicial</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{schedule.filter((day) => day.active).length} días activos</p>
          <p className="text-sm text-[color:var(--ink-muted)]">Editable luego desde el dashboard.</p>
        </div>
      </div>
      <p className="text-sm text-[color:var(--ink-faint)]">Tu perfil no será visible hasta que completes el alta.</p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderAccountStep();
      case 1:
        return renderTypeStep();
      case 2:
        return renderProfileStep();
      case 3:
        return renderCategoriesStep();
      case 4:
        return renderModalityStep();
      case 5:
        return renderLocationStep();
      case 6:
        return renderScheduleStep();
      case 7:
        return renderServiceStep();
      default:
        return renderPreviewStep();
    }
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="professional" />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <form className="w-full" onSubmit={(event) => void handleSubmit(event)}>
          <Card tone="default" padding="lg" className="mx-auto w-full max-w-6xl space-y-10 rounded-[36px] border-[color:var(--border-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-glass)] sm:p-10 lg:p-14">
            {stepHeader}
            {renderCurrentStep()}

            {successMessage ? (
              <p className="mx-auto max-w-3xl rounded-[16px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)] px-4 py-3 text-sm text-[color:var(--primary)]">
                {successMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mx-auto max-w-3xl rounded-[16px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[color:var(--border-soft)] pt-6 sm:flex-row sm:items-center sm:justify-center">
              {step > 0 ? (
                <Button type="button" variant="secondary" size="lg" className="min-w-56" onClick={goBack}>
                  Volver
                </Button>
              ) : null}
              {step < wizardSteps.length - 1 ? (
                <Button type="button" variant={step === 0 ? 'brand' : 'primary'} size="lg" className="min-w-72" onClick={goNext}>
                  Continuar
                </Button>
              ) : (
                <Button type="submit" variant="primary" size="lg" className="min-w-72" disabled={isSubmitting}>
                  {isSubmitting
                    ? isOAuthSetup
                      ? 'Guardando configuración...'
                      : 'Creando perfil...'
                    : isOAuthSetup
                      ? 'Guardar y entrar al dashboard'
                      : 'Publicar perfil'}
                </Button>
              )}
            </div>
          </Card>
        </form>
      </main>
      <AuthLoadingOverlay
        visible={isBusy}
        title="Registrando cuenta"
        description={
          isGoogleLoading
            ? 'Creando tu cuenta profesional con Google.'
            : 'Guardando tus datos y preparando tu perfil profesional.'
        }
      />
    </div>
  );
}
