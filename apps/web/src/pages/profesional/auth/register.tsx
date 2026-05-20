'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Marker, type MapRef } from 'react-map-gl/mapbox';
import axios from 'axios';
import AuthTopBar from '@/components/auth/AuthTopBar';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import MapView from '@/components/map/MapView';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import api from '@/services/api';
import {
  createProfessionalRegistrationCheckout,
  fetchCurrentSubscription,
  isCoreSubscriptionEnabled,
  verifyProfessionalRegistrationCheckout,
} from '@/lib/billing/billing';
import {
  applyProfessionalRegisterHandoff,
  clearPendingProfessionalRegisterHandoff,
  savePendingProfessionalRegisterHandoff,
  type ProfessionalRegisterHandoff,
} from '@/lib/professional/registerHandoff';
import { setAuthAccessToken } from '@/services/session';
import { useCategories } from '@/hooks/useCategories';
import { mapboxForwardGeocode, mapboxReverseGeocode } from '@/services/mapbox';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '@/services/geo';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import type { OAuthLoginResult } from '@/lib/auth/oauthLogin';
import { getGoogleOAuthAppOrigin } from '@/lib/auth/googleOAuth';
import {
  activateProfessionalProfile,
  fetchAuthMe,
  hasContext,
  persistAccessTokenForContext,
  selectAuthContext,
  type UnifiedLoginResponse,
} from '@/lib/auth/contexts';

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

type SchedulePause = {
  id: string;
  dayId: string;
  start: string;
  end: string;
};

type LocationPreview = {
  latitude: number;
  longitude: number;
  placeName: string;
};

type RegistrationAvailabilityResponse = {
  emailAvailable: boolean;
  phoneAvailable: boolean;
  emailError?: string | null;
  phoneError?: string | null;
};

type LocationSelectionSource = 'address' | 'browser' | 'map';
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
  pauses: Array<{
    id: string;
    startDate: string;
    endDate: string;
    note?: string;
  }>;
  slotDurationMinutes: number;
};

type ProfessionalOnboardingDraft = {
  form: Omit<RegisterForm, 'password' | 'confirmPassword'>;
  schedule: ScheduleDay[];
  schedulePauses?: SchedulePause[];
};

type ProfessionalRegistrationPayload = {
  fullName: string;
  rubro: string;
  categorySlugs: string[];
  email: string;
  phoneNumber: string;
  country: string;
  city: string;
  fullAddress: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  tipoCliente: RegisterForm['tipoCliente'];
  password?: string;
  oauthRegistrationToken?: string;
  billingCheckoutToken?: string;
};

type PendingProfessionalRegistrationCheckout = {
  checkoutToken: string | null;
  checkoutRef: string | null;
  checkoutUrl: string | null;
  payload: ProfessionalRegistrationPayload;
  handoff: ProfessionalRegisterHandoff;
  hasAuthenticatedBaseAccount: boolean;
  createdAt: number;
};

type PendingCheckoutAction = {
  checkoutToken: string | null;
  checkoutRef: string | null;
  checkoutUrl: string | null;
};

const PROFESSIONAL_ONBOARDING_DRAFT_KEY = 'plura:professional-onboarding-draft';
const PROFESSIONAL_REGISTRATION_CHECKOUT_KEY = 'plura:professional-registration-checkout';
const PROFESSIONAL_REGISTRATION_CHECKOUT_TTL_MS = 2 * 60 * 60 * 1000;
const PROFESSIONAL_CHECKOUT_VERIFY_MAX_ATTEMPTS = 5;
const PROFESSIONAL_CHECKOUT_VERIFY_RETRY_DELAY_MS = 2000;
const PROFESSIONAL_SUBSCRIPTION_READ_MAX_ATTEMPTS = 5;
const PROFESSIONAL_SUBSCRIPTION_READ_RETRY_DELAY_MS = 1200;
const PROFESSIONAL_SUBSCRIPTION_READ_PENDING_MESSAGE =
  'Mercado Pago fue confirmado y la cuenta profesional se creó, pero todavía no pudimos leer la suscripción activa. Entrá a Facturación o reintentá en unos segundos.';

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const hasQueryFlag = (value: string | string[] | undefined) => (
  Array.isArray(value) ? value.includes('1') : value === '1'
);

const getQueryStringValue = (value: string | string[] | undefined) => (
  Array.isArray(value) ? value[0] ?? null : value ?? null
);

const normalizeOptionalString = (value: unknown) => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isExpiredPendingCheckout = (createdAt: unknown) => (
  typeof createdAt === 'number' &&
  Number.isFinite(createdAt) &&
  Date.now() - createdAt > PROFESSIONAL_REGISTRATION_CHECKOUT_TTL_MS
);

const isCompletePendingCheckout = (
  value: unknown,
): value is PendingProfessionalRegistrationCheckout => {
  if (!isRecord(value)) return false;
  const hasCheckoutIdentifier =
    normalizeOptionalString(value.checkoutToken) !== null ||
    normalizeOptionalString(value.checkoutRef) !== null;

  return (
    hasCheckoutIdentifier &&
    (
      value.checkoutUrl === null ||
      value.checkoutUrl === undefined ||
      typeof value.checkoutUrl === 'string'
    ) &&
    isRecord(value.payload) &&
    isRecord(value.handoff) &&
    typeof value.hasAuthenticatedBaseAccount === 'boolean' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    value.createdAt <= Date.now() + 60_000 &&
    Date.now() - value.createdAt <= PROFESSIONAL_REGISTRATION_CHECKOUT_TTL_MS
  );
};

const isTerminalCheckoutStatus = (status?: string | null) => (
  status === 'REJECTED' ||
  status === 'CANCELLED' ||
  status === 'EXPIRED'
);

const resolveCheckoutStatusMessage = (status?: string | null) => {
  if (status === 'REJECTED') {
    return 'Mercado Pago rechazó la suscripción. No se creó el perfil profesional; podés intentar la activación nuevamente.';
  }
  if (status === 'CANCELLED') {
    return 'La activación de Mercado Pago fue cancelada. No se creó el perfil profesional; podés intentar nuevamente.';
  }
  if (status === 'EXPIRED') {
    return 'La activación pendiente de Mercado Pago venció. No se creó el perfil profesional; podés reintentar desde el wizard.';
  }
  return 'Mercado Pago todavía no confirmó la suscripción. No se creó el perfil profesional; podés reintentar la verificación cuando quieras.';
};

const fetchCurrentCoreSubscriptionWithRetry = async () => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= PROFESSIONAL_SUBSCRIPTION_READ_MAX_ATTEMPTS; attempt += 1) {
    try {
      const subscription = await fetchCurrentSubscription();
      if (isCoreSubscriptionEnabled(subscription)) {
        return subscription;
      }
      lastError = null;
    } catch (error) {
      lastError = error;
    }

    if (attempt < PROFESSIONAL_SUBSCRIPTION_READ_MAX_ATTEMPTS) {
      await wait(PROFESSIONAL_SUBSCRIPTION_READ_RETRY_DELAY_MS);
    }
  }

  if (lastError) {
    throw new Error(PROFESSIONAL_SUBSCRIPTION_READ_PENDING_MESSAGE);
  }

  return null;
};
const DEFAULT_LOCATION_PREVIEW: LocationPreview = {
  latitude: -34.9011,
  longitude: -56.1645,
  placeName: 'Montevideo, Uruguay',
};

const wizardSteps = [
  'Cuenta',
  'Datos',
  'Rubros',
  'Atención',
  'Ubicación',
  'Horarios',
  'Core',
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
  'h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] shadow-[var(--shadow-card)] transition focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)] sm:h-12 sm:rounded-[18px]';
const textAreaClassName =
  'min-h-20 w-full resize-none rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] shadow-[var(--shadow-card)] transition focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)] sm:min-h-24 sm:rounded-[18px]';
const wizardTitleClassName =
  'text-2xl font-semibold tracking-[-0.04em] text-[color:var(--ink)] sm:text-3xl xl:text-4xl';

export default function ProfesionalRegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const controlledAddProfessionalFlow =
    router.query.mode === 'add-professional' || router.query.resume === '1';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
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
  const [schedulePauses, setSchedulePauses] = useState<SchedulePause[]>([]);
  const [isOAuthSetup, setIsOAuthSetup] = useState(false);
  const [oauthRegistrationToken, setOauthRegistrationToken] = useState<string | null>(null);
  const [hasAuthenticatedBaseAccount, setHasAuthenticatedBaseAccount] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [locationPreview, setLocationPreview] = useState<LocationPreview | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationPreview>(DEFAULT_LOCATION_PREVIEW);
  const [isLocationPreviewLoading, setIsLocationPreviewLoading] = useState(false);
  const [isBrowserLocationLoading, setIsBrowserLocationLoading] = useState(false);
  const [isReverseGeocodingLocation, setIsReverseGeocodingLocation] = useState(false);
  const [locationSelectionSource, setLocationSelectionSource] = useState<LocationSelectionSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutConfirmationMessage, setCheckoutConfirmationMessage] = useState<string | null>(null);
  const [pendingCheckoutAction, setPendingCheckoutAction] = useState<PendingCheckoutAction | null>(null);
  const [remoteFieldErrors, setRemoteFieldErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const locationMapRef = useRef<MapRef | null>(null);
  const initialLocationRequestDoneRef = useRef(false);
  const billingReturnHandledRef = useRef(false);
  const visibleStepNumber = Math.min(step + 1, wizardSteps.length);

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

  useEffect(() => {
    if (!router.isReady) return;
    const queryEmail = Array.isArray(router.query.email)
      ? router.query.email[0]
      : router.query.email;
    if (queryEmail?.trim()) {
      const normalizedEmail = queryEmail.trim().toLowerCase();
      setForm((prev) => ({
        ...prev,
        email: prev.email || normalizedEmail,
        confirmEmail: prev.confirmEmail || normalizedEmail,
      }));
    }
  }, [router.isReady, router.query.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(PROFESSIONAL_ONBOARDING_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<ProfessionalOnboardingDraft>;
      if (draft.form && typeof draft.form === 'object') {
        setForm((prev) => ({
          ...prev,
          ...draft.form,
          password: '',
          confirmPassword: '',
        }));
      }
      if (Array.isArray(draft.schedule) && draft.schedule.length > 0) {
        setSchedule(draft.schedule);
      }
      if (Array.isArray(draft.schedulePauses)) {
        setSchedulePauses(draft.schedulePauses);
      }
    } catch {
      window.localStorage.removeItem(PROFESSIONAL_ONBOARDING_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;
    const isBillingReturn = hasQueryFlag(router.query.billingReturn);
    if (!isBillingReturn) return;
    if (billingReturnHandledRef.current) return;
    billingReturnHandledRef.current = true;
    const checkoutRefFromUrl = normalizeOptionalString(getQueryStringValue(router.query.checkoutRef));

    const clearBillingReturnQuery = () => {
      void router.replace('/profesional/auth/register', undefined, { shallow: true });
    };

    const pending = readPendingCheckoutRegistration();
    const checkoutToken = pending?.checkoutToken ?? null;
    const checkoutRef = checkoutRefFromUrl ?? pending?.checkoutRef ?? null;
    let isActive = true;

    if (!checkoutToken && !checkoutRef) {
      clearBillingReturnQuery();
      setErrorMessage('No encontramos una activación pendiente de Mercado Pago. No se creó el perfil profesional; podés reintentar desde el wizard.');
      return;
    }

    const resumePendingCheckout = async () => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setPendingCheckoutAction(null);
      setCheckoutConfirmationMessage('Confirmando activación con Mercado Pago...');
      try {
        clearBillingReturnQuery();

        let confirmedCheckoutToken: string | null = null;
        let lastStatus: string | null = null;
        let lastCheckoutUrl: string | null = pending?.checkoutUrl ?? null;
        for (let attempt = 1; attempt <= PROFESSIONAL_CHECKOUT_VERIFY_MAX_ATTEMPTS; attempt += 1) {
          const verification = await verifyProfessionalRegistrationCheckout({
            checkoutToken,
            checkoutRef,
          });
          if (!isActive) return;
          lastStatus = verification.status;
          lastCheckoutUrl = verification.checkoutUrl || lastCheckoutUrl;

          if (verification.confirmed) {
            confirmedCheckoutToken = verification.checkoutToken || checkoutToken;
            break;
          }

          if (isTerminalCheckoutStatus(verification.status)) {
            break;
          }

          if (attempt < PROFESSIONAL_CHECKOUT_VERIFY_MAX_ATTEMPTS) {
            await wait(PROFESSIONAL_CHECKOUT_VERIFY_RETRY_DELAY_MS);
            if (!isActive) return;
          }
        }

        if (!confirmedCheckoutToken) {
          setPendingCheckoutAction({
            checkoutToken,
            checkoutRef,
            checkoutUrl: lastCheckoutUrl,
          });
          setErrorMessage(resolveCheckoutStatusMessage(lastStatus));
          return;
        }

        if (!pending) {
          setErrorMessage('Mercado Pago confirmó Core, pero no encontramos los datos del wizard en este navegador. Volvé a completar el alta; no se abrirá Mercado Pago automáticamente.');
          return;
        }

        await createProfessionalAfterConfirmed(
          pending.payload,
          pending.handoff,
          pending.hasAuthenticatedBaseAccount,
          confirmedCheckoutToken,
        );
      } catch (error) {
        setErrorMessage(extractApiMessage(error, 'No pudimos confirmar Mercado Pago. No se creó el perfil profesional.'));
      } finally {
        if (isActive) {
          setCheckoutConfirmationMessage(null);
          setIsSubmitting(false);
        }
      }
    };

    void resumePendingCheckout();
    return () => {
      isActive = false;
    };
  // Se ejecuta solo al volver/cargar la pagina con un checkout pendiente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    let isActive = true;
    void fetchAuthMe()
      .then((me) => {
        if (!isActive) return;
        if (!controlledAddProfessionalFlow) {
          const activeType = me.activeContext?.type;
          if (activeType === 'CLIENT') {
            void router.replace('/cliente/inicio');
            return;
          }
          if (activeType === 'WORKER') {
            void router.replace('/trabajador/calendario');
            return;
          }
          void router.replace('/profesional/dashboard');
          return;
        }
        if (hasContext(me.contexts, 'PROFESSIONAL')) {
          void router.replace('/profesional/dashboard');
          return;
        }
        setHasAuthenticatedBaseAccount(true);
        const email = me.user?.email?.trim().toLowerCase() || '';
        setForm((prev) => ({
          ...prev,
          email: prev.email || email,
          confirmEmail: prev.confirmEmail || email,
          fullName: prev.fullName || me.user?.fullName?.trim() || '',
          password: '',
          confirmPassword: '',
        }));
        setTouched((prev) => ({
          ...prev,
          email: Boolean(email),
          confirmEmail: Boolean(email),
          fullName: Boolean(me.user?.fullName?.trim()),
          password: true,
          confirmPassword: true,
        }));
        setIsOAuthSetup(true);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [controlledAddProfessionalFlow, router]);

  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );

  const selectedCategoryNames = form.categorySlugs
    .map((slug) => categoryNameBySlug.get(slug))
    .filter(Boolean) as string[];
  const primaryCategoryName = selectedCategoryNames[0] || 'Estética Facial';
  const filteredCategories = categories.filter((category) => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return true;
    return category.name.toLowerCase().includes(query) || category.slug.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!requiresLocation) {
      setLocationPreview(null);
      setMapCenter(DEFAULT_LOCATION_PREVIEW);
      setIsLocationPreviewLoading(false);
      return undefined;
    }

    const country = form.country.trim();
    const city = form.city.trim();
    const fullAddress = form.fullAddress.trim();

    if (!country || !city || fullAddress.length < 4) {
      if (locationSelectionSource !== 'map') {
        setLocationPreview(null);
      }
      setIsLocationPreviewLoading(false);
      return undefined;
    }

    if (locationSelectionSource === 'map') {
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
          applyLocationSelection(result, 'address', { updateAddressFields: false });
        })
        .finally(() => {
          setIsLocationPreviewLoading(false);
        });
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.country, form.city, form.fullAddress, locationSelectionSource, requiresLocation]);

  useEffect(() => {
    if (!requiresLocation || step !== 4 || initialLocationRequestDoneRef.current) {
      return;
    }
    initialLocationRequestDoneRef.current = true;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void reverseLookupAndApplyLocation(
          position.coords.latitude,
          position.coords.longitude,
          'browser',
          { silent: true },
        );
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  // La geolocalización inicial debe correr una sola vez al entrar a este paso.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresLocation, step]);

  useEffect(() => {
    if (!requiresLocation || locationSelectionSource === 'map') {
      return;
    }

    const map = locationMapRef.current;
    if (!map) {
      return;
    }

    map.flyTo({
      center: [mapCenter.longitude, mapCenter.latitude],
      duration: 500,
    });
  }, [locationSelectionSource, mapCenter, requiresLocation]);

  const passwordValid = form.password.length >= 8;
  const validationErrors: Record<keyof RegisterForm, string> = {
    email: emailPattern.test(emailValue) ? remoteFieldErrors.email || '' : 'Email inválido.',
    confirmEmail: confirmEmailValue.length > 0 && confirmEmailValue === emailValue
      ? ''
      : 'Los correos no coinciden.',
    password: isOAuthSetup || passwordValid ? '' : 'Mínimo 8 caracteres.',
    confirmPassword: isOAuthSetup || (form.confirmPassword.length > 0 && form.confirmPassword === form.password)
      ? ''
      : 'Las contraseñas no coinciden.',
    fullName: form.fullName.trim().length >= 3 ? '' : 'Mínimo 3 caracteres.',
    phoneNumber: form.phoneNumber.replace(/\D/g, '').length >= 8
      ? remoteFieldErrors.phoneNumber || ''
      : 'Ingresá un número válido.',
    description: form.description.trim().length > 150 ? 'Máximo 150 caracteres.' : '',
    categorySlugs: form.categorySlugs.length > 0 ? '' : 'Seleccioná al menos un rubro.',
    tipoCliente: form.tipoCliente ? '' : 'Seleccioná una modalidad.',
    country: requiresLocation && form.country.trim().length === 0 ? 'Indicá el país.' : '',
    city: requiresLocation && form.city.trim().length === 0 ? 'Indicá la ciudad.' : '',
    fullAddress: requiresLocation && form.fullAddress.trim().length === 0
      ? 'Indicá la dirección completa.'
      : '',
    serviceName: '',
    serviceCategorySlug: '',
    serviceDuration: '',
    servicePrice: '',
    serviceDescription: '',
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
        return ['fullName', 'phoneNumber', 'description'];
      case 2:
        return ['categorySlugs'];
      case 3:
        return ['tipoCliente'];
      case 4:
        return requiresLocation ? ['country', 'city', 'fullAddress'] : [];
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
    if (name === 'email') {
      setRemoteFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    setSuccessMessage(null);
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handlePhoneChange = (nextPhoneNumber: string) => {
    setForm((prev) => ({ ...prev, phoneNumber: nextPhoneNumber }));
    setRemoteFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
  };

  const handlePhoneBlur = () => {
    setTouched((prev) => ({ ...prev, phoneNumber: true }));
  };

  const handleOAuthAuthenticated = async (result: OAuthLoginResult) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const oauthEmail = result.user.email?.trim().toLowerCase() || '';
    const oauthPhoneNumber = (result.user.phoneNumber ?? '').trim();

    setIsOAuthSetup(true);
    setOauthRegistrationToken(result.oauthRegistrationToken?.trim() || null);
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
    setStep(1);
    setSuccessMessage(
      oauthPhoneNumber
        ? 'Identidad Google verificada. Continuá el onboarding profesional sobre este mismo email.'
        : 'Identidad Google verificada. El teléfono se completa en el paso de datos básicos.',
    );
  };

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setLocationSelectionSource(null);
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

  const applyLocationSelection = (
    result: {
      latitude: number;
      longitude: number;
      placeName: string;
      country?: string;
      city?: string;
      fullAddress?: string;
    },
    source: LocationSelectionSource,
    options: { updateAddressFields?: boolean; recenterMap?: boolean } = {},
  ) => {
    const updateAddressFields = options.updateAddressFields ?? true;
    const recenterMap = options.recenterMap ?? source !== 'map';
    const nextPlaceName = result.placeName?.trim() || 'Ubicación seleccionada en el mapa';

    if (recenterMap) {
      setMapCenter({
        latitude: result.latitude,
        longitude: result.longitude,
        placeName: nextPlaceName,
      });
    }
    setLocationPreview({
      latitude: result.latitude,
      longitude: result.longitude,
      placeName: nextPlaceName,
    });
    setLocationSelectionSource(source);

    if (updateAddressFields) {
      setForm((prev) => ({
        ...prev,
        country: result.country?.trim() || prev.country,
        city: result.city?.trim() || prev.city,
        fullAddress: result.fullAddress?.trim() || prev.fullAddress || nextPlaceName,
      }));
      setTouched((prev) => ({
        ...prev,
        country: true,
        city: true,
        fullAddress: true,
      }));
    }

    setGeoSuggestions([]);
    setActiveGeoField(null);
  };

  const reverseLookupAndApplyLocation = async (
    latitude: number,
    longitude: number,
    source: LocationSelectionSource,
    options: { silent?: boolean; recenterMap?: boolean } = {},
  ) => {
    setIsReverseGeocodingLocation(true);
    if (!options.silent) {
      setErrorMessage(null);
    }

    try {
      const result = await mapboxReverseGeocode(latitude, longitude);
      applyLocationSelection(
        result || {
          latitude,
          longitude,
          placeName: 'Ubicación seleccionada en el mapa',
          fullAddress: 'Ubicación seleccionada en el mapa',
        },
        source,
        { recenterMap: options.recenterMap },
      );
    } catch {
      if (!options.silent) {
        setErrorMessage('No pudimos actualizar esa ubicación. Probá mover el mapa o escribir la dirección.');
      }
    } finally {
      setIsReverseGeocodingLocation(false);
    }
  };

  const handleUseBrowserLocation = () => {
    setErrorMessage(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Tu navegador no permite obtener la ubicación automáticamente.');
      return;
    }

    setIsBrowserLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsBrowserLocationLoading(false);
        void reverseLookupAndApplyLocation(
          position.coords.latitude,
          position.coords.longitude,
          'browser',
        );
      },
      () => {
        setIsBrowserLocationLoading(false);
        setErrorMessage('No pudimos obtener tu ubicación. Podés escribirla o seleccionarla en el mapa.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const updateLocationFromMapPoint = (latitude: number, longitude: number) => {
    setLocationPreview({
      latitude,
      longitude,
      placeName: 'Pin ajustado manualmente. Esta será la ubicación publicada.',
    });
    setLocationSelectionSource('map');
    void reverseLookupAndApplyLocation(latitude, longitude, 'map', { recenterMap: false });
  };

  const handleMapClick = (event: unknown) => {
    const lngLat = (event as { lngLat?: { lng?: number; lat?: number } }).lngLat;
    const latitude = lngLat?.lat;
    const longitude = lngLat?.lng;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    updateLocationFromMapPoint(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: unknown) => {
    const lngLat = (event as { lngLat?: { lng?: number; lat?: number } }).lngLat;
    const latitude = lngLat?.lat;
    const longitude = lngLat?.lng;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    updateLocationFromMapPoint(latitude, longitude);
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
      applyLocationSelection(
        {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          placeName: (suggestion.placeName || suggestion.fullAddress || fullAddress || city || country || '').trim(),
          country,
          city,
          fullAddress,
        },
        'address',
      );
    }

    setGeoSuggestions([]);
    setActiveGeoField(null);
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

  const addSchedulePause = () => {
    const defaultDayId = schedule.find((day) => day.active)?.id || 'monday';
    setSchedulePauses((prev) => [
      ...prev,
      {
        id: `pause-${Date.now()}`,
        dayId: defaultDayId,
        start: '12:00',
        end: '13:00',
      },
    ]);
  };

  const updateSchedulePause = (id: string, patch: Partial<SchedulePause>) => {
    setSchedulePauses((prev) => prev.map((pause) => {
      if (pause.id !== id) return pause;
      const nextPause = { ...pause, ...patch };
      if (nextPause.start >= nextPause.end) {
        return pause;
      }
      return nextPause;
    }));
  };

  const removeSchedulePause = (id: string) => {
    setSchedulePauses((prev) => prev.filter((pause) => pause.id !== id));
  };

  const applyWeekSchedule = () => {
    setSchedule((prev) => prev.map((day) => ({
      ...day,
      active: day.id !== 'sunday',
      open: '09:00',
      close: day.id === 'saturday' ? '13:00' : '18:00',
    })));
  };

  const buildDayRanges = (day: ScheduleDay) => {
    if (!day.active) return [];
    const dayPauses = schedulePauses
      .filter((pause) => (
        pause.dayId === day.id
        && pause.start < pause.end
        && pause.start > day.open
        && pause.end < day.close
      ))
      .sort((first, second) => first.start.localeCompare(second.start));

    if (dayPauses.length === 0) {
      return [{
        id: `${day.id}-main`,
        start: day.open,
        end: day.close,
      }];
    }

    const ranges: Array<{ id: string; start: string; end: string }> = [];
    let cursor = day.open;
    dayPauses.forEach((pause) => {
      if (cursor < pause.start) {
        ranges.push({
          id: `${day.id}-${ranges.length + 1}`,
          start: cursor,
          end: pause.start,
        });
      }
      if (pause.end > cursor) {
        cursor = pause.end;
      }
    });
    if (cursor < day.close) {
      ranges.push({
        id: `${day.id}-${ranges.length + 1}`,
        start: cursor,
        end: day.close,
      });
    }

    return ranges;
  };

  const buildSchedulePayload = (): ProfessionalSchedulePayload => ({
    days: schedule.map((day) => ({
      day: day.id,
      enabled: day.active,
      paused: false,
      ranges: buildDayRanges(day),
    })),
    pauses: [],
    slotDurationMinutes: Math.max(15, Number(form.serviceDuration) || 60),
  });

  const buildRegisterHandoff = (): ProfessionalRegisterHandoff => ({
    schedule: buildSchedulePayload() as ProfessionalRegisterHandoff['schedule'],
    firstService: null,
    publicPage: {
      about: form.description.trim(),
    },
  });

  const checkRegistrationAvailability = async (fields: Array<'email' | 'phoneNumber'>) => {
    const response = await api.post<RegistrationAvailabilityResponse>('/auth/register/availability', {
      email: fields.includes('email') ? emailValue : undefined,
      phoneNumber: fields.includes('phoneNumber') ? form.phoneNumber.trim() : undefined,
      desiredContext: 'PROFESSIONAL',
    });
    const nextErrors: Partial<Record<keyof RegisterForm, string>> = {};
    if (fields.includes('email') && !response.data.emailAvailable) {
      nextErrors.email = response.data.emailError || 'Ya existe una cuenta activa con este email. Iniciá sesión para continuar.';
    }
    if (fields.includes('phoneNumber') && !response.data.phoneAvailable) {
      nextErrors.phoneNumber = response.data.phoneError || 'Ese teléfono ya pertenece a otra cuenta activa.';
    }
    setRemoteFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = async () => {
    setErrorMessage(null);
    const fields = stepFields(step);
    markTouched(fields);
    if (!currentStepIsValid(step)) {
      setErrorMessage('Revisá los datos marcados para continuar.');
      return;
    }
    const availabilityFields: Array<'email' | 'phoneNumber'> = [];
    if (step === 0 && !isOAuthSetup) {
      availabilityFields.push('email');
    }
    if (step === 1) {
      availabilityFields.push('phoneNumber');
    }
    if (availabilityFields.length > 0) {
      setIsCheckingAvailability(true);
      try {
        const available = await checkRegistrationAvailability(availabilityFields);
        if (!available) {
          markTouched(availabilityFields);
          setErrorMessage('Revisá los datos marcados para continuar.');
          return;
        }
      } catch (error) {
        setErrorMessage(extractApiMessage(error, 'No pudimos validar si esos datos ya están registrados.'));
        return;
      } finally {
        setIsCheckingAvailability(false);
      }
    }
    setStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const goBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const saveOnboardingDraftForLogin = () => {
    if (typeof window === 'undefined') return;
    const safeForm = {
      email: form.email,
      confirmEmail: form.confirmEmail,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      description: form.description,
      categorySlugs: form.categorySlugs,
      tipoCliente: form.tipoCliente,
      country: form.country,
      city: form.city,
      fullAddress: form.fullAddress,
      serviceName: form.serviceName,
      serviceCategorySlug: form.serviceCategorySlug,
      serviceDuration: form.serviceDuration,
      servicePrice: form.servicePrice,
      serviceDescription: form.serviceDescription,
    };
    window.localStorage.setItem(
      PROFESSIONAL_ONBOARDING_DRAFT_KEY,
      JSON.stringify({
        form: safeForm,
        schedule,
        schedulePauses,
      } satisfies ProfessionalOnboardingDraft),
    );
  };

  const savePendingCheckoutRegistration = (
    pending: PendingProfessionalRegistrationCheckout,
  ) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY, JSON.stringify(pending));
  };

  const readPendingCheckoutRegistration = () => {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isExpiredPendingCheckout(isRecord(parsed) ? parsed.createdAt : undefined)) {
        window.sessionStorage.removeItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY);
        return null;
      }
      if (!isCompletePendingCheckout(parsed)) {
        window.sessionStorage.removeItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY);
        return null;
      }
      return parsed;
    } catch {
      window.sessionStorage.removeItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY);
      return null;
    }
  };

  const clearPendingCheckoutRegistration = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(PROFESSIONAL_REGISTRATION_CHECKOUT_KEY);
  };

  const activateProfessionalForCurrentAccount = async (
    payload: ProfessionalRegistrationPayload,
  ) => {
    const me = await activateProfessionalProfile({
      rubro: payload.rubro,
      categorySlugs: payload.categorySlugs,
      country: payload.country,
      city: payload.city,
      fullAddress: payload.fullAddress,
      location: payload.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
      tipoCliente: payload.tipoCliente,
      phoneNumber: payload.phoneNumber,
      billingCheckoutToken: payload.billingCheckoutToken,
    });
    const professionalContext = me.contexts?.find((context) => context.type === 'PROFESSIONAL');
    if (professionalContext) {
      await selectAuthContext(professionalContext);
    } else {
      await selectAuthContext('PROFESSIONAL');
    }

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
        whatsapp: payload.phoneNumber,
      });
    } catch {
      // El perfil ya queda activo; el dashboard permite completar ajustes de datos si esta actualizacion parcial falla.
    }
  };

  const createProfessionalAfterConfirmed = async (
    payload: ProfessionalRegistrationPayload,
    handoff: ProfessionalRegisterHandoff,
    useCurrentAccount: boolean,
    checkoutToken: string,
  ) => {
    savePendingProfessionalRegisterHandoff(handoff);

    const confirmedPayload = {
      ...payload,
      billingCheckoutToken: checkoutToken,
    };

    if (useCurrentAccount) {
      await activateProfessionalForCurrentAccount(confirmedPayload);
    } else if (payload.oauthRegistrationToken) {
      const registerResponse = await api.post<UnifiedLoginResponse>('/auth/register/profesional', {
        ...confirmedPayload,
      });
      const activeContext = registerResponse.data?.activeContext ?? null;
      if (activeContext?.type !== 'PROFESSIONAL') {
        throw new Error('La cuenta profesional se creó, pero no pudimos iniciar sesión profesional automáticamente.');
      }
      persistAccessTokenForContext(registerResponse.data?.accessToken ?? null, activeContext);
    } else {
      await api.post('/auth/register/profesional', {
        ...confirmedPayload,
      });
      const loginResponse = await api.post<{
        accessToken?: string | null;
        activeContext?: { type: 'PROFESSIONAL' };
      }>('/auth/login', {
        email: payload.email,
        password: payload.password,
        desiredContext: 'PROFESSIONAL',
      });
      setAuthAccessToken(loginResponse.data?.accessToken ?? null, 'PROFESSIONAL');
    }

    const subscription = await fetchCurrentCoreSubscriptionWithRetry();
    if (!subscription) {
      throw new Error(PROFESSIONAL_SUBSCRIPTION_READ_PENDING_MESSAGE);
    }

    try {
      await applyProfessionalRegisterHandoff(handoff);
    } catch {
      clearPendingProfessionalRegisterHandoff();
      clearPendingCheckoutRegistration();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PROFESSIONAL_ONBOARDING_DRAFT_KEY);
      }
      setErrorMessage('Plura Core quedó activo, pero no pudimos publicar la configuración inicial. Podés reintentar desde Facturación.');
      await refreshProfile();
      await router.push({
        pathname: '/profesional/dashboard/billing',
        query: { setup: 'pending' },
      });
      return;
    }

    clearPendingProfessionalRegisterHandoff();
    clearPendingCheckoutRegistration();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PROFESSIONAL_ONBOARDING_DRAFT_KEY);
    }
    await refreshProfile();
    await router.push('/profesional/auth/bienvenido');
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setErrorMessage(null);
    setPendingCheckoutAction(null);
    setCheckoutConfirmationMessage(null);
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
        ? locationPreview || await mapboxForwardGeocode(normalizedLocation)
        : null;

      if (requiresLocation && !geocodedLocation) {
        setErrorMessage('No pudimos ubicar esa dirección. Escribí una dirección más precisa o seleccioná el punto en el mapa.');
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
        password: isOAuthSetup ? undefined : form.password,
        oauthRegistrationToken: oauthRegistrationToken ?? undefined,
      } satisfies ProfessionalRegistrationPayload;

      if (isOAuthSetup && !oauthRegistrationToken && !hasAuthenticatedBaseAccount) {
        setErrorMessage('No pudimos validar la identidad Google. Volvé a iniciar el registro con Google.');
        return;
      }

      const handoff = buildRegisterHandoff();
      savePendingProfessionalRegisterHandoff(handoff);
      saveOnboardingDraftForLogin();

      const checkout = await createProfessionalRegistrationCheckout({
        email: normalizedEmail,
        returnUrl: typeof window !== 'undefined'
          ? `${window.location.origin}/profesional/auth/register?billingReturn=1`
          : undefined,
      });
      const checkoutToken = normalizeOptionalString(checkout.checkoutToken);
      const checkoutRef = normalizeOptionalString(checkout.checkoutRef);

      savePendingCheckoutRegistration({
        checkoutToken,
        checkoutRef,
        checkoutUrl: checkout.checkoutUrl,
        payload,
        handoff,
        hasAuthenticatedBaseAccount,
        createdAt: Date.now(),
      });

      if (!checkoutToken && !checkoutRef) {
        clearPendingCheckoutRegistration();
        setErrorMessage('No pudimos crear una referencia de activación válida. No se creó el perfil profesional; podés reintentar.');
        return;
      }

      if (!checkout.checkoutUrl) {
        setErrorMessage('No pudimos iniciar Mercado Pago. No se creó el perfil profesional; podés reintentar.');
        return;
      }

      setIsRedirectingToCheckout(true);
      window.location.assign(checkout.checkoutUrl);
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
            pathname: '/login',
            query: {
              intent: 'professional',
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

  const handleRetryCheckoutVerification = async () => {
    const checkoutAction = pendingCheckoutAction;
    if (!checkoutAction?.checkoutToken && !checkoutAction?.checkoutRef) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setCheckoutConfirmationMessage('Reintentando verificación con Mercado Pago...');
    try {
      const verification = await verifyProfessionalRegistrationCheckout({
        checkoutToken: checkoutAction.checkoutToken,
        checkoutRef: checkoutAction.checkoutRef,
      });
      const nextAction = {
        checkoutToken: verification.checkoutToken || checkoutAction.checkoutToken,
        checkoutRef: verification.checkoutRef || checkoutAction.checkoutRef,
        checkoutUrl: verification.checkoutUrl || checkoutAction.checkoutUrl,
      };

      if (!verification.confirmed) {
        setPendingCheckoutAction(nextAction);
        setErrorMessage(resolveCheckoutStatusMessage(verification.status));
        return;
      }

      const confirmedCheckoutToken = verification.checkoutToken || checkoutAction.checkoutToken;
      if (!confirmedCheckoutToken) {
        setPendingCheckoutAction(nextAction);
        setErrorMessage('Mercado Pago confirmó Core, pero no recibimos una credencial válida para crear el perfil. Reintentá la verificación.');
        return;
      }

      const pending = readPendingCheckoutRegistration();
      if (!pending) {
        setPendingCheckoutAction(null);
        setErrorMessage('Mercado Pago confirmó Core, pero no encontramos los datos del wizard en este navegador. Volvé a completar el alta; no se abrirá Mercado Pago automáticamente.');
        return;
      }

      await createProfessionalAfterConfirmed(
        pending.payload,
        pending.handoff,
        pending.hasAuthenticatedBaseAccount,
        confirmedCheckoutToken,
      );
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No pudimos confirmar Mercado Pago. No se creó el perfil profesional.'));
    } finally {
      setCheckoutConfirmationMessage(null);
      setIsSubmitting(false);
    }
  };

  const renderError = (field: keyof RegisterForm) => (
    touched[field] && validationErrors[field] ? (
      <p className="text-xs text-red-600">{validationErrors[field]}</p>
    ) : null
  );

  const stepHeader = (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
      <span className="text-sm font-semibold text-[color:var(--ink)]">
        {step >= wizardSteps.length - 1 ? 'Activar Plura Core' : `Paso ${visibleStepNumber} de ${wizardSteps.length}`}
      </span>
      <div className="flex items-center gap-3" aria-label="Progreso del registro profesional">
        {wizardSteps.map((item, index) => (
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
      <div className={`${compact ? 'h-20 sm:h-28' : 'h-24 sm:h-32'} bg-[linear-gradient(135deg,rgba(223,196,161,0.72),rgba(255,250,244,0.9)),radial-gradient(circle_at_80%_20%,rgba(10,122,67,0.16),transparent_30%)]`} />
      <div className={`${compact ? 'space-y-3 px-4 pb-4 pt-9 sm:px-5' : 'space-y-3 px-4 pb-5 pt-10 sm:px-6 sm:pb-6 sm:pt-11'} relative`}>
        <div className={`${compact ? '-top-8 h-16 w-16 text-[10px]' : '-top-10 h-20 w-20 text-xs'} absolute left-5 flex items-center justify-center rounded-full border-4 border-[color:var(--surface-strong)] bg-[color:var(--surface-soft)] text-center font-semibold uppercase tracking-[0.18em] text-[color:var(--primary)] shadow-[var(--shadow-card)] sm:left-6`}>
          {(form.fullName.trim() || 'EB')
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('') || 'EB'}
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)] sm:text-2xl">
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
            <p className="max-h-20 overflow-hidden text-sm leading-6 text-[color:var(--ink-muted)]">
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.7fr)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Badge variant="success">Registro</Badge>
          <h1 className={wizardTitleClassName}>
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
          onError={setErrorMessage}
          buttonLabel="Continuar con Google"
          loadingLabel="Registrando..."
        />
        {isOAuthSetup ? (
          <div className="rounded-[24px] border border-[color:var(--primary-soft)] bg-[color:var(--primary-soft)] p-5 text-sm text-[color:var(--primary-strong)]">
            <p className="font-semibold">Identidad Google verificada</p>
            <p className="mt-1 text-[color:var(--ink-muted)]">
              {form.email || 'Tu cuenta de Google'} se usará al finalizar el registro. Continuá con el mismo wizard: tipo de perfil, datos básicos, teléfono, rubros y publicación.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">o con email</span>
              <div className="h-px flex-1 bg-[color:var(--border-soft)]" />
            </div>
            <div className="grid gap-3 xl:grid-cols-2 xl:gap-4">
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
          </>
        )}
        <p className="text-center text-sm text-[color:var(--ink-muted)]">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login?intent=professional" className="font-semibold text-[color:var(--primary)]">
            Iniciar sesión profesional
          </Link>
        </p>
      </div>
      <div className="hidden space-y-4 lg:block">
        <h2 className="text-center text-xl font-semibold text-[color:var(--ink)]">Así te verán tus clientes</h2>
        <ProfilePreviewCard compact />
        <p className="text-center text-xs text-[color:var(--ink-faint)]">Este es un ejemplo de cómo se verá tu perfil público.</p>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-center xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.7fr)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <Badge variant="success">Perfil</Badge>
          <h1 className={wizardTitleClassName}>Contanos cómo querés aparecer en Plura</h1>
          <p className="text-base text-[color:var(--ink-muted)]">Estos datos se verán en tu perfil público.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
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
            <p className="text-xs text-[color:var(--ink-muted)]">
              Usaremos este teléfono como contacto visible/operativo del perfil.
            </p>
          </div>
          <div className="space-y-2 xl:col-span-2">
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
      <div className="hidden space-y-4 lg:block">
        <h2 className="text-center text-xl font-semibold text-[color:var(--ink)]">Vista previa</h2>
        <ProfilePreviewCard compact />
      </div>
    </div>
  );

  const renderCategoriesStep = () => (
    <div className="mx-auto max-w-6xl space-y-5 text-center">
      <div className="space-y-2">
        <Badge variant="success">Registro</Badge>
        <h1 className={wizardTitleClassName}>Elegí tus rubros principales</h1>
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
        <div className="grid gap-3 pr-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCategories.map((category) => {
            const selected = form.categorySlugs.includes(category.slug);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.slug)}
                className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
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
            : locationSelectionSource === 'map'
              ? 'Pin ajustado manualmente. Esta será la ubicación publicada.'
              : locationPreview?.placeName || 'Mové el mapa o usá tu ubicación para ajustar el punto.'}
        </p>
      </div>
    </div>
  );

  const renderModalityStep = () => (
    <div className="mx-auto max-w-6xl space-y-5 text-center">
      <div className="space-y-2">
        <Badge variant="success">Registro</Badge>
        <h1 className={wizardTitleClassName}>¿Cómo atendés a tus clientes?</h1>
        <p className="text-base text-[color:var(--ink-muted)]">Elegí la modalidad principal. Después vas a poder cambiarla.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
              className={`relative rounded-[22px] border p-4 text-center transition hover:-translate-y-0.5 sm:p-5 ${
                selected
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)] shadow-[var(--shadow-lift)]'
                  : 'border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] shadow-[var(--shadow-card)]'
              }`}
            >
              {selected ? <span className="absolute right-5 top-5 rounded-full bg-[color:var(--primary)] px-2 py-1 text-xs text-white">✓</span> : null}
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--surface-soft)] text-3xl sm:h-16 sm:w-16">{option.icon}</span>
              <h2 className="mt-3 text-lg font-semibold text-[color:var(--ink)]">{option.title}</h2>
              <p className="mt-2 text-sm leading-5 text-[color:var(--ink-muted)]">{option.description}</p>
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
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <Badge variant="success">Ubicación</Badge>
          <h1 className={wizardTitleClassName}>Ubicación no obligatoria</h1>
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

    const visibleMapCenter = mapCenter;
    const selectedMapLocation = locationPreview || mapCenter;

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-center xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.95fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Badge variant="success">Registro</Badge>
            <h1 className={wizardTitleClassName}>¿Dónde atendés?</h1>
            <p className="text-base text-[color:var(--ink-muted)]">Ingresá la ubicación de tu local.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {(['country', 'city', 'fullAddress'] as const).map((field) => (
              <div key={field} className={`relative space-y-2 ${field === 'fullAddress' ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''}`}>
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
          <div className="relative h-[min(38dvh,22rem)] min-h-64">
            <div className="absolute left-3 right-3 top-3 z-10 rounded-[20px] border border-[color:var(--border-soft)] bg-[color:var(--surface)]/95 p-3 shadow-[var(--shadow-card)] backdrop-blur sm:left-4 sm:right-4 sm:top-4 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">Ajustá la ubicación</p>
                  <p className="text-xs text-[color:var(--ink-muted)]">Mové el mapa y hacé zoom hasta que el pin quede sobre la entrada exacta.</p>
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={handleUseBrowserLocation}
                  disabled={isBrowserLocationLoading || isReverseGeocodingLocation}
                  className="shrink-0"
                >
                  {isBrowserLocationLoading ? 'Detectando...' : 'Usar mi ubicación'}
                </Button>
              </div>
            </div>
            <MapView
              mapRef={locationMapRef}
              initialViewState={{
                latitude: visibleMapCenter.latitude,
                longitude: visibleMapCenter.longitude,
                zoom: 15,
              }}
              dragPan
              scrollZoom
              doubleClickZoom
              touchZoomRotate
              attributionControl={false}
              cooperativeGestures={false}
              onClick={handleMapClick}
              reuseMaps
              fallbackMessage="Falta NEXT_PUBLIC_MAPBOX_TOKEN para mostrar el mapa."
              webglFallbackNode={<LocationMapFallback />}
            >
              <Marker
                latitude={selectedMapLocation.latitude}
                longitude={selectedMapLocation.longitude}
                anchor="bottom"
                draggable
                onDragEnd={handleMarkerDragEnd}
              >
                <div className="relative flex cursor-grab flex-col items-center drop-shadow-[0_10px_16px_rgba(15,23,42,0.24)] active:cursor-grabbing">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--primary)] ring-[3px] ring-white">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div className="-mt-1 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[color:var(--primary)]" />
                </div>
              </Marker>
            </MapView>
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-[20px] border border-[color:var(--border-soft)] bg-[color:var(--surface)] p-3 shadow-[var(--shadow-card)] backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:p-4">
              <p className="font-semibold text-[color:var(--ink)]">Ubicación del perfil</p>
              <p className="text-sm text-[color:var(--ink-muted)]">
                {isLocationPreviewLoading || isReverseGeocodingLocation
                  ? 'Actualizando mapa...'
                  : locationSelectionSource === 'map'
                    ? 'Pin ajustado manualmente. Esta será la ubicación publicada.'
                    : locationPreview?.placeName || 'Mové el pin, tocá el mapa o usá tu ubicación para ajustar el punto.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleStep = () => (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 text-center">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:text-left">
        <div className="space-y-1.5">
          <Badge variant="success">Registro</Badge>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--ink)] sm:text-3xl">Definí tus horarios de atención</h1>
          <p className="text-sm text-[color:var(--ink-muted)] sm:text-base">Estos horarios se usarán como base inicial de tu agenda.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={applyWeekSchedule}>Aplicar horario a todos</Button>
          <Button type="button" variant="secondary" size="sm" onClick={addSchedulePause}>Agregar descanso</Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-x-auto rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] text-left shadow-[var(--shadow-card)]">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.2fr_0.65fr_1fr_1fr] gap-4 border-b border-[color:var(--border-soft)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--ink-muted)]">
              <span>Día</span>
              <span>Activo</span>
              <span>Apertura</span>
              <span>Cierre</span>
            </div>
            {schedule.map((day) => (
              <div key={day.id} className="grid grid-cols-[1.2fr_0.65fr_1fr_1fr] items-center gap-4 border-b border-[color:var(--border-soft)] px-5 py-2.5 last:border-b-0">
                <span className="font-semibold text-[color:var(--ink)]">{day.label}</span>
                <button
                  type="button"
                  onClick={() => updateScheduleDay(day.id, { active: !day.active })}
                  className={`h-6 w-11 rounded-full p-1 transition ${day.active ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--border-strong)]'}`}
                  aria-label={`Activar ${day.label}`}
                >
                  <span className={`block h-4 w-4 rounded-full bg-white transition ${day.active ? 'translate-x-5' : ''}`} />
                </button>
                {day.active ? (
                  <input
                    type="time"
                    className="h-9 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-3 text-sm text-[color:var(--ink)]"
                    value={day.open}
                    onChange={(event) => updateScheduleDay(day.id, { open: event.target.value })}
                  />
                ) : <span className="text-sm text-[color:var(--ink-faint)]">—</span>}
                {day.active ? (
                  <input
                    type="time"
                    className="h-9 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] px-3 text-sm text-[color:var(--ink)]"
                    value={day.close}
                    onChange={(event) => updateScheduleDay(day.id, { close: event.target.value })}
                  />
                ) : <span className="text-sm text-[color:var(--ink-faint)]">Cerrado</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-4 text-left shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--ink-muted)]">Descansos</p>
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">Bloquean un tramo dentro del horario del día.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addSchedulePause}>Agregar</Button>
          </div>
          <div className="mt-4 space-y-3">
            {schedulePauses.length === 0 ? (
              <p className="rounded-[16px] bg-[color:var(--surface-muted)] px-3 py-3 text-sm text-[color:var(--ink-muted)]">
                Sin descansos configurados.
              </p>
            ) : (
              schedulePauses.map((pause) => (
                <div key={pause.id} className="grid gap-3 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-muted)] p-3">
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr]">
                    <label className="grid gap-1 text-xs font-semibold text-[color:var(--ink-muted)]">
                      Día
                      <select
                        className="h-9 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3 text-sm font-normal text-[color:var(--ink)]"
                        value={pause.dayId}
                        onChange={(event) => updateSchedulePause(pause.id, { dayId: event.target.value })}
                      >
                        {schedule.map((day) => (
                          <option key={day.id} value={day.id}>{day.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-[color:var(--ink-muted)]">
                      Inicio
                      <input
                        type="time"
                        className="h-9 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3 text-sm font-normal text-[color:var(--ink)]"
                        value={pause.start}
                        max={pause.end}
                        onChange={(event) => updateSchedulePause(pause.id, { start: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-[color:var(--ink-muted)]">
                      Fin
                      <input
                        type="time"
                        className="h-9 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-3 text-sm font-normal text-[color:var(--ink)]"
                        value={pause.end}
                        min={pause.start}
                        onChange={(event) => updateSchedulePause(pause.id, { end: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--ink-muted)]">
                    <span>{pause.start} a {pause.end}</span>
                    <button
                      type="button"
                      className="font-semibold text-red-600 transition hover:text-red-700"
                      onClick={() => removeSchedulePause(pause.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <p className="text-left text-xs text-[color:var(--ink-muted)] sm:text-sm">Sin horarios, los clientes no podrán reservar automáticamente.</p>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="space-y-2">
        <Badge variant="success">30 días gratis</Badge>
        <h1 className={wizardTitleClassName}>Activá Plura Core</h1>
        <p className="max-w-3xl text-base text-[color:var(--ink-muted)]">
          Tu perfil queda listo para publicarse. Tenés 30 días gratis para probar Plura Core.
          Luego continúa la suscripción mensual.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--primary)]">Plura Core</p>
          <h2 className="text-2xl font-semibold text-[color:var(--ink)]">Incluye la operación base del MVP</h2>
          <ul className="space-y-3 text-sm leading-6 text-[color:var(--ink-muted)]">
            <li>Marketplace, agenda, servicios, reservas y perfil público.</li>
            <li>Perfil público con logo, banner, descripción y fotos.</li>
            <li>Pagos online con Mercado Pago cuando completes la autorización.</li>
            <li>Mercado Pago puede pedirte autorizar el medio de pago para mantener Core al finalizar la prueba.</li>
          </ul>
        </div>
        <ProfilePreviewCard />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5 text-left">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Agenda inicial</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{schedule.filter((day) => day.active).length} días activos</p>
          <p className="text-sm text-[color:var(--ink-muted)]">Editable luego desde el dashboard.</p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5 text-left">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Servicios</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">Se configuran en el dashboard</p>
          <p className="text-sm text-[color:var(--ink-muted)]">El alta inicial no publica servicios automáticamente.</p>
        </div>
      </div>
      <p className="text-sm text-[color:var(--ink-faint)]">Tu perfil no será visible hasta que completes el alta y la activación.</p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderAccountStep();
      case 1:
        return renderProfileStep();
      case 2:
        return renderCategoriesStep();
      case 3:
        return renderModalityStep();
      case 4:
        return renderLocationStep();
      case 5:
        return renderScheduleStep();
      default:
        return renderPreviewStep();
    }
  };

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="professional" />
      <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 items-start justify-center overflow-hidden px-3 py-3 sm:px-6 sm:py-4 lg:py-5">
        <form className="h-full w-full" onSubmit={(event) => event.preventDefault()}>
          <Card tone="default" padding="none" className="mx-auto flex h-full w-full max-w-[90rem] flex-col overflow-hidden rounded-[28px] border-[color:var(--border-soft)] bg-[color:var(--surface)] shadow-[var(--shadow-glass)] sm:rounded-[32px]">
            <div className="shrink-0 border-b border-[color:var(--border-soft)] px-4 py-3 sm:px-6 lg:px-8">
              {stepHeader}
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
              {renderCurrentStep()}

              {successMessage ? (
                <p className="mx-auto max-w-3xl rounded-[16px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)] px-4 py-3 text-sm text-[color:var(--primary)]">
                  {successMessage}
                </p>
              ) : null}

              {checkoutConfirmationMessage ? (
                <p className="mx-auto max-w-3xl rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink-muted)]">
                  {checkoutConfirmationMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <div className="mx-auto max-w-3xl rounded-[16px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
                  <p>{errorMessage}</p>
                </div>
              ) : null}

              {pendingCheckoutAction ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-[16px] border border-[color:var(--border-soft)] bg-[color:var(--surface-strong)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[color:var(--ink-muted)]">
                    La activación está pendiente de confirmación.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      loadingLabel="Verificando..."
                      onClick={() => void handleRetryCheckoutVerification()}
                    >
                      Reintentar verificación
                    </Button>
                    {pendingCheckoutAction.checkoutUrl ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isRedirectingToCheckout}
                        loading={isRedirectingToCheckout}
                        loadingLabel="Abriendo..."
                        onClick={() => {
                          const checkoutUrl = pendingCheckoutAction.checkoutUrl;
                          if (!checkoutUrl) return;
                          setIsRedirectingToCheckout(true);
                          window.location.assign(checkoutUrl);
                        }}
                      >
                        Volver a Mercado Pago
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-[color:var(--border-soft)] bg-[color:var(--surface)]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                {step > 0 ? (
                  <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto sm:min-w-44" onClick={goBack}>
                    Volver
                  </Button>
                ) : null}
                {step < wizardSteps.length - 1 ? (
                  <Button
                    type="button"
                    variant={step === 0 ? 'brand' : 'primary'}
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-56"
                    onClick={() => void goNext()}
                    disabled={isCheckingAvailability}
                    loading={isCheckingAvailability}
                    loadingLabel="Validando..."
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-56"
                    disabled={isRedirectingToCheckout}
                    loading={isSubmitting || isRedirectingToCheckout}
                    loadingLabel={
                      isRedirectingToCheckout
                        ? 'Redirigiendo a Mercado Pago...'
                        : checkoutConfirmationMessage
                          ? checkoutConfirmationMessage
                        : isOAuthSetup
                          ? 'Activando Plura Core...'
                          : 'Creando perfil...'
                    }
                    onClick={() => void handleSubmit()}
                  >
                    Activar prueba gratuita
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </form>
      </main>
    </div>
  );
}
