'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import ProfessionalDashboardShell from '@/components/profesional/dashboard/ProfessionalDashboardShell';
import Button from '@/components/ui/Button';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useCategories } from '@/hooks/useCategories';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import api from '@/services/api';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '@/services/geo';
import ImageUploader from '@/components/profesional/dashboard/ImageUploader';
import { resolveAssetUrl } from '@/utils/assetUrl';
import {
  DashboardHeaderBadge,
  DashboardPageHeader,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import type { ProfessionalMediaPresentation } from '@/types/professional';
import type {
  ProfessionalSchedule,
  PublicService,
} from '@/types/professional';
import {
  DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION,
  normalizeProfessionalMediaPresentation,
} from '@/utils/professionalMediaPresentation';

type PhotoItem = {
  id: string;
  url: string;
};

type PublicPageForm = {
  headline: string;
  about: string;
};

type BusinessProfileForm = {
  businessName: string;
  categorySlugs: string[];
  logoUrl: string;
  bannerUrl: string;
  logoMedia: ProfessionalMediaPresentation;
  bannerMedia: ProfessionalMediaPresentation;
  location: string;
  country: string;
  city: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  website: string;
  whatsapp: string;
};

const createEmptyPhotos = (count = 1): PhotoItem[] =>
  Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `photo-${index + 1}`,
    url: '',
  }));

const createEmptyBusinessForm = (): BusinessProfileForm => ({
  businessName: '',
  categorySlugs: [],
  logoUrl: '',
  bannerUrl: '',
  logoMedia: DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION,
  bannerMedia: DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION,
  location: '',
  country: '',
  city: '',
  fullAddress: '',
  latitude: undefined,
  longitude: undefined,
  phone: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  whatsapp: '',
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  peluqueria: 'cabello',
  cejas: 'pestanas-cejas',
  pestanas: 'pestanas-cejas',
  faciales: 'estetica-facial',
  kinesiologia: 'fisioterapia',
  'fisioterapia-kinesiologia': 'fisioterapia',
  'fisioterapia-o-kinesiologia': 'fisioterapia',
  'rehabilitacion-recuperacion-fisica': 'rehabilitacion',
  'meditacion-mindfulness': 'meditacion',
  'tratamientos-corporales': 'tratamientos-corporales',
  'medicina-estetica': 'medicina-estetica',
  'bienestar-holistico': 'bienestar-holistico',
};

const dedupeSlugs = (slugs: string[]) =>
  Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));

export default function ProfesionalPublicPresencePage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const { categories, isLoading: isLoadingCategories } = useCategories();
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [origin, setOrigin] = useState('https://plura.com');

  const [hasInitializedBusiness, setHasInitializedBusiness] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isBusinessDirty, setIsBusinessDirty] = useState(false);
  const [businessSaveMessage, setBusinessSaveMessage] = useState<string | null>(null);
  const [businessSaveError, setBusinessSaveError] = useState(false);
  const [businessForm, setBusinessForm] = useState<BusinessProfileForm>(createEmptyBusinessForm);
  const [initialBusinessForm, setInitialBusinessForm] = useState<BusinessProfileForm | null>(null);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);

  const [isSavingPublicPage, setIsSavingPublicPage] = useState(false);
  const [publicSaveMessage, setPublicSaveMessage] = useState<string | null>(null);
  const [publicSaveError, setPublicSaveError] = useState(false);
  const [isPublicPageDirty, setIsPublicPageDirty] = useState(false);
  const [hasLoadedPublicPage, setHasLoadedPublicPage] = useState(false);
  const [services, setServices] = useState<PublicService[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [publicForm, setPublicForm] = useState<PublicPageForm>({ headline: '', about: '' });
  const [initialPublicForm, setInitialPublicForm] = useState<PublicPageForm | null>(null);
  const maxBusinessPhotos = profile?.professionalEntitlements?.maxBusinessPhotos ?? 3;
  const [photos, setPhotos] = useState<PhotoItem[]>(createEmptyPhotos());
  const [initialPhotos, setInitialPhotos] = useState<PhotoItem[] | null>(null);

  useEffect(() => {
    if (!profile || hasInitializedBusiness) return;
    const hasProfileCategories = Array.isArray(profile.categories) && profile.categories.length > 0;
    if (!hasProfileCategories && isLoadingCategories) return;

    const profileCategorySlugs = hasProfileCategories
      ? dedupeSlugs(profile.categories!.map((category) => category.slug))
      : [];
    const fallbackRubroSlug = profile.rubro ? slugify(profile.rubro) : '';
    const mappedFallbackSlug = LEGACY_CATEGORY_ALIASES[fallbackRubroSlug] || fallbackRubroSlug;
    const fallbackCategory = categories.find((category) =>
      category.slug === mappedFallbackSlug || slugify(category.name) === mappedFallbackSlug,
    );
    const categorySlugs = profileCategorySlugs.length > 0
      ? profileCategorySlugs
      : fallbackCategory
        ? [fallbackCategory.slug]
        : [];

    const initialData: BusinessProfileForm = {
      businessName: profile.fullName || '',
      categorySlugs,
      logoUrl: profile.logoUrl || '',
      bannerUrl: profile.bannerUrl || '',
      logoMedia: normalizeProfessionalMediaPresentation(profile.logoMedia),
      bannerMedia: normalizeProfessionalMediaPresentation(profile.bannerMedia),
      location: profile.location || '',
      country: profile.country || '',
      city: profile.city || '',
      fullAddress: profile.fullAddress || '',
      latitude: typeof profile.latitude === 'number' ? profile.latitude : undefined,
      longitude: typeof profile.longitude === 'number' ? profile.longitude : undefined,
      phone: profile.phoneNumber || '',
      instagram: profile.instagram || '',
      facebook: profile.facebook || '',
      tiktok: profile.tiktok || '',
      website: profile.website || '',
      whatsapp: profile.whatsapp || '',
    };

    setBusinessForm(initialData);
    setInitialBusinessForm(initialData);
    setIsBusinessDirty(false);
    setHasInitializedBusiness(true);
  }, [profile, hasInitializedBusiness, categories, isLoadingCategories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'plura-preview-ready') {
        setIframeReady(true);
      }
    };
    window.addEventListener('message', handleReady);
    return () => window.removeEventListener('message', handleReady);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    api
      .get<PublicService[]>('/profesional/services')
      .then((response) => setServices(Array.isArray(response.data) ? response.data : []))
      .catch(() => setServices([]));
    api
      .get<ProfessionalSchedule>('/profesional/schedule')
      .then((response) => {
        const data = response.data;
        setSchedule(data && Array.isArray(data.days)
          ? { days: data.days, pauses: Array.isArray(data.pauses) ? data.pauses : [] }
          : null);
      })
      .catch(() => setSchedule(null));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || hasLoadedPublicPage) return;
    api
      .get('/profesional/public-page')
      .then((response) => {
        const data = response.data as {
          headline?: string | null;
          about?: string | null;
          photos?: string[] | null;
        };
        const loadedForm: PublicPageForm = {
          headline: data.headline ?? '',
          about: data.about ?? '',
        };
        const loadedPhotos =
          data.photos && data.photos.length > 0
            ? data.photos.slice(0, maxBusinessPhotos).map((url, index) => ({
                id: `photo-${index + 1}`,
                url,
              }))
            : createEmptyPhotos();
        setPublicForm(loadedForm);
        setInitialPublicForm(loadedForm);
        setPhotos(loadedPhotos);
        setInitialPhotos(loadedPhotos);
        setIsPublicPageDirty(false);
      })
      .catch(() => {
        setPublicSaveMessage('No se pudo cargar la información. Intentá recargar la página.');
        setPublicSaveError(true);
      })
      .finally(() => setHasLoadedPublicPage(true));
  }, [profile, hasLoadedPublicPage, maxBusinessPhotos]);

  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );
  const displayName = businessForm.businessName || profile?.fullName || '';
  const displayCategory =
    categoryNameBySlug.get(businessForm.categorySlugs[0]) || profile?.rubro || '';
  const resolvedSlug = profile?.slug?.trim() || slugify(displayName || 'profesional');
  const slug = useMemo(() => resolvedSlug || 'profesional', [resolvedSlug]);
  const publicUrl = `${origin}/profesional/pagina/${slug || 'profesional'}`;
  const reviewUrl = `${publicUrl}?fromDashboard=1`;
  const showSkeleton = !hasLoaded || (isLoading && !profile);
  const canManageEnhancedContent = featureAccess.enhancedPublicProfile;
  const canAddPhoto = photos.length < maxBusinessPhotos;
  const filledPhotoCount = useMemo(() => photos.filter((photo) => photo.url).length, [photos]);
  const previewServices: PublicService[] = useMemo(
    () =>
      services.map((service) => ({
        id: service.id,
        name: service.name || 'Servicio',
        description: service.description || '',
        categorySlug: service.categorySlug || null,
        categoryName: service.categoryName || null,
        imageUrl: resolveAssetUrl(service.imageUrl || ''),
        price: service.price || 'Consultar',
        duration: service.duration || '',
      })),
    [services],
  );
  const previewPayload = useMemo(
    () => ({
      type: 'plura-preview',
      payload: {
        name: displayName,
        category: displayCategory,
        logoUrl: resolveAssetUrl(businessForm.logoUrl || ''),
        logoMedia: normalizeProfessionalMediaPresentation(businessForm.logoMedia),
        bannerUrl: resolveAssetUrl(businessForm.bannerUrl || ''),
        bannerMedia: normalizeProfessionalMediaPresentation(businessForm.bannerMedia),
        headline: publicForm.headline,
        about: publicForm.about,
        photos: photos.map((photo) => photo.url).filter(Boolean).map((url) => resolveAssetUrl(url)).filter(Boolean),
        services: previewServices,
        schedule,
      },
    }),
    [
      businessForm.bannerMedia,
      businessForm.bannerUrl,
      businessForm.logoMedia,
      businessForm.logoUrl,
      displayCategory,
      displayName,
      photos,
      previewServices,
      publicForm.about,
      publicForm.headline,
      schedule,
    ],
  );

  useEffect(() => {
    if (!iframeReady || typeof window === 'undefined') return;
    iframeRef.current?.contentWindow?.postMessage(previewPayload, window.location.origin);
  }, [iframeReady, previewPayload]);

  const inputClassName =
    'h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  const markBusinessDirty = () => {
    setIsBusinessDirty(true);
    setBusinessSaveMessage(null);
  };

  const handleBusinessChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBusinessForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'location' || name === 'country' || name === 'city' || name === 'fullAddress'
        ? { latitude: undefined, longitude: undefined }
        : {}),
    }));
    markBusinessDirty();
  };

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setBusinessForm((prev) => ({
      ...prev,
      [field]: value,
      latitude: undefined,
      longitude: undefined,
    }));
    setActiveGeoField(field);
    markBusinessDirty();
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
    const location = [fullAddress, city, country].filter(Boolean).join(', ');

    setBusinessForm((prev) => ({
      ...prev,
      country: country || prev.country,
      city: city || prev.city,
      fullAddress: fullAddress || prev.fullAddress,
      location: location || prev.location,
      latitude: typeof suggestion.latitude === 'number' ? suggestion.latitude : prev.latitude,
      longitude: typeof suggestion.longitude === 'number' ? suggestion.longitude : prev.longitude,
    }));
    setGeoSuggestions([]);
    setActiveGeoField(null);
    markBusinessDirty();
  };

  const toggleCategory = (slugValue: string) => {
    setBusinessForm((prev) => {
      const selected = prev.categorySlugs.includes(slugValue);
      return {
        ...prev,
        categorySlugs: selected
          ? prev.categorySlugs.filter((value) => value !== slugValue)
          : [...prev.categorySlugs, slugValue],
      };
    });
    markBusinessDirty();
  };

  const handlePhoneChange = (nextPhoneNumber: string) => {
    setBusinessForm((prev) => ({ ...prev, phone: nextPhoneNumber }));
    markBusinessDirty();
  };

  const handleSaveBusiness = useCallback(async (): Promise<boolean> => {
    if (isSavingBusiness) return false;
    if (!businessForm.businessName.trim() || !businessForm.phone.trim()) {
      setBusinessSaveMessage('Completá nombre, rubro y teléfono para guardar.');
      setBusinessSaveError(true);
      return false;
    }

    setIsSavingBusiness(true);
    setBusinessSaveMessage(null);
    setBusinessSaveError(false);

    try {
      const validCategorySlugs = dedupeSlugs(businessForm.categorySlugs).filter((slugValue) =>
        categoryNameBySlug.has(slugValue),
      );
      if (validCategorySlugs.length === 0) {
        setBusinessSaveMessage('Seleccioná al menos un rubro válido para guardar.');
        setBusinessSaveError(true);
        setIsSavingBusiness(false);
        return false;
      }

      const primaryCategoryName = categoryNameBySlug.get(validCategorySlugs[0]) || '';
      const normalizedCountry = businessForm.country.trim();
      const normalizedCity = businessForm.city.trim();
      const normalizedFullAddress = businessForm.fullAddress.trim();
      const normalizedLocation = [normalizedFullAddress, normalizedCity, normalizedCountry]
        .filter(Boolean)
        .join(', ');

      if (!normalizedCountry || !normalizedCity || !normalizedFullAddress) {
        setBusinessSaveMessage('Completá país, ciudad y dirección completa para guardar.');
        setBusinessSaveError(true);
        setIsSavingBusiness(false);
        return false;
      }

      let latitude: number | null = typeof businessForm.latitude === 'number' ? businessForm.latitude : null;
      let longitude: number | null = typeof businessForm.longitude === 'number' ? businessForm.longitude : null;

      if (normalizedLocation) {
        const needsGeocoding =
          !initialBusinessForm ||
          normalizedLocation.toLocaleLowerCase('es-UY') !==
            initialBusinessForm.location.trim().toLocaleLowerCase('es-UY') ||
          latitude === null ||
          longitude === null;

        if (needsGeocoding) {
          const geocoded = await mapboxForwardGeocode(normalizedLocation);
          if (!geocoded) {
            setBusinessSaveMessage('No pudimos ubicar esa dirección. Revisala antes de guardar.');
            setBusinessSaveError(true);
            return false;
          }
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      } else {
        latitude = null;
        longitude = null;
      }

      const normalizedPayload = {
        fullName: businessForm.businessName.trim(),
        rubro: primaryCategoryName,
        categorySlugs: validCategorySlugs,
        location: normalizedLocation,
        country: normalizedCountry,
        city: normalizedCity,
        fullAddress: normalizedFullAddress,
        latitude,
        longitude,
        phoneNumber: businessForm.phone.trim(),
        logoUrl: businessForm.logoUrl.trim(),
        bannerUrl: businessForm.bannerUrl.trim(),
        logoMedia: normalizeProfessionalMediaPresentation(businessForm.logoMedia),
        bannerMedia: normalizeProfessionalMediaPresentation(businessForm.bannerMedia),
        instagram: businessForm.instagram.trim(),
        facebook: businessForm.facebook.trim(),
        tiktok: businessForm.tiktok.trim(),
        website: businessForm.website.trim(),
        whatsapp: businessForm.whatsapp.trim(),
      };
      await api.put('/profesional/profile', { ...normalizedPayload });
      await refreshProfile();
      const persistedForm: BusinessProfileForm = {
        businessName: normalizedPayload.fullName,
        categorySlugs: normalizedPayload.categorySlugs,
        location: normalizedPayload.location,
        country: normalizedPayload.country,
        city: normalizedPayload.city,
        fullAddress: normalizedPayload.fullAddress,
        latitude: normalizedPayload.latitude ?? undefined,
        longitude: normalizedPayload.longitude ?? undefined,
        phone: normalizedPayload.phoneNumber,
        logoUrl: normalizedPayload.logoUrl,
        bannerUrl: normalizedPayload.bannerUrl,
        logoMedia: normalizedPayload.logoMedia,
        bannerMedia: normalizedPayload.bannerMedia,
        instagram: normalizedPayload.instagram,
        facebook: normalizedPayload.facebook,
        tiktok: normalizedPayload.tiktok,
        website: normalizedPayload.website,
        whatsapp: normalizedPayload.whatsapp,
      };
      setBusinessForm(persistedForm);
      setInitialBusinessForm(persistedForm);
      setBusinessSaveMessage('Presencia pública actualizada correctamente.');
      setBusinessSaveError(false);
      setIsBusinessDirty(false);
      return true;
    } catch (error) {
      const backendMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setBusinessSaveMessage(
        backendMessage && backendMessage.trim()
          ? backendMessage.trim()
          : 'No se pudo guardar la presencia pública.',
      );
      setBusinessSaveError(true);
      return false;
    } finally {
      setIsSavingBusiness(false);
    }
  }, [businessForm, categoryNameBySlug, initialBusinessForm, isSavingBusiness, refreshProfile]);

  const handleResetBusiness = useCallback(() => {
    if (!initialBusinessForm) return;
    setBusinessForm(initialBusinessForm);
    setIsBusinessDirty(false);
    setBusinessSaveMessage(null);
    setBusinessSaveError(false);
  }, [initialBusinessForm]);

  const handlePublicChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setPublicForm((prev) => ({ ...prev, [name]: value }));
    setIsPublicPageDirty(true);
    setPublicSaveMessage(null);
  };

  const handlePhotoUrlChange = (index: number, url: string) => {
    setPhotos((prev) =>
      prev.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, url } : photo,
      ),
    );
    setIsPublicPageDirty(true);
    setPublicSaveMessage(null);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
    setIsPublicPageDirty(true);
    setPublicSaveMessage(null);
  };

  const addPhoto = () => {
    setPhotos((prev) => {
      if (prev.length >= maxBusinessPhotos) return prev;
      setIsPublicPageDirty(true);
      setPublicSaveMessage(null);
      return [...prev, { id: `photo-${prev.length + 1}`, url: '' }];
    });
  };

  const handleSavePublicPage = useCallback(async (): Promise<boolean> => {
    if (isSavingPublicPage) return false;
    setIsSavingPublicPage(true);
    setPublicSaveMessage(null);
    setPublicSaveError(false);

    try {
      const persistedPhotos = photos.map((photo) => photo.url).filter(Boolean);
      await api.put('/profesional/public-page', {
        ...(canManageEnhancedContent ? {
          headline: publicForm.headline,
          about: publicForm.about,
        } : {}),
        photos: persistedPhotos,
      });
      const nextForm: PublicPageForm = {
        headline: canManageEnhancedContent ? publicForm.headline : (initialPublicForm?.headline ?? publicForm.headline),
        about: canManageEnhancedContent ? publicForm.about : (initialPublicForm?.about ?? publicForm.about),
      };
      const nextPhotos = photos.map((photo, index) => ({
        id: photo.id || `photo-${index + 1}`,
        url: photo.url,
      }));
      setPublicForm(nextForm);
      setInitialPublicForm(nextForm);
      setPhotos(nextPhotos);
      setInitialPhotos(nextPhotos);
      setPublicSaveMessage('Vista previa pública actualizada correctamente.');
      setPublicSaveError(false);
      setIsPublicPageDirty(false);
      return true;
    } catch {
      setPublicSaveMessage('No se pudo guardar. Intentá de nuevo.');
      setPublicSaveError(true);
      return false;
    } finally {
      setIsSavingPublicPage(false);
    }
  }, [canManageEnhancedContent, initialPublicForm, isSavingPublicPage, photos, publicForm]);

  const handleResetPublicPage = useCallback(() => {
    if (!initialPublicForm || !initialPhotos) return;
    setPublicForm(initialPublicForm);
    setPhotos(initialPhotos);
    setIsPublicPageDirty(false);
    setPublicSaveMessage(null);
    setPublicSaveError(false);
  }, [initialPublicForm, initialPhotos]);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'business-profile',
    isDirty: isBusinessDirty,
    isSaving: isSavingBusiness,
    onSave: handleSaveBusiness,
    onReset: handleResetBusiness,
  });

  useProfessionalDashboardUnsavedSection({
    sectionId: 'public-page',
    isDirty: isPublicPageDirty,
    isSaving: isSavingPublicPage,
    onSave: handleSavePublicPage,
    onReset: handleResetPublicPage,
  });

  const messageClassName = (isError: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] ${
      isError
        ? 'border-red-200 bg-red-50 text-red-500'
        : 'border-[#cdeee9] bg-[#f0fffc] text-[#1FB6A6]'
    }`;

  return (
    <ProfessionalDashboardShell profile={profile} active="Presencia pública">
      <div className="space-y-6">
        <DashboardPageHeader
          eyebrow="Negocio"
          title="Presencia pública"
          description="Editá en un solo lugar la identidad, descripción, contacto, galería y vista previa que ve el cliente."
          meta={
            <>
              <DashboardHeaderBadge tone="success">
                {businessForm.categorySlugs.length} rubros
              </DashboardHeaderBadge>
              <DashboardHeaderBadge>
                {filledPhotoCount} fotos cargadas
              </DashboardHeaderBadge>
              {isBusinessDirty || isPublicPageDirty ? (
                <DashboardHeaderBadge tone="warning">
                  Cambios sin guardar
                </DashboardHeaderBadge>
              ) : null}
            </>
          }
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSaveBusiness()}
                disabled={isSavingBusiness}
                variant="secondary"
                className="px-4"
              >
                {isSavingBusiness ? 'Guardando...' : 'Guardar identidad'}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSavePublicPage()}
                disabled={isSavingPublicPage}
                variant="primary"
                className="px-4"
              >
                {isSavingPublicPage ? 'Guardando...' : 'Guardar página'}
              </Button>
            </div>
          )}
        />

        {businessSaveMessage ? (
          <p className={messageClassName(businessSaveError)}>{businessSaveMessage}</p>
        ) : null}
        {publicSaveMessage ? (
          <p className={messageClassName(publicSaveError)}>{publicSaveMessage}</p>
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
            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <DashboardSectionHeading
                eyebrow="Vista previa"
                title="Vista previa pública"
                description="El resultado final se actualiza a medida que ajustás identidad, textos y fotos."
                action={(
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    Ver como cliente
                  </a>
                )}
              />
              <div className="mt-5 overflow-hidden rounded-[22px] border border-[#E2E7EC] bg-white">
                <iframe
                  ref={iframeRef}
                  title="Vista previa pública"
                  src="/profesional/pagina/preview?preview=1"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                  className="h-[460px] w-full sm:h-[620px] xl:h-[780px]"
                />
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <DashboardStatCard
                label="Slug"
                value={slug}
                detail="Identidad pública de la ficha"
                icon="share"
                tone="accent"
              />
              <DashboardStatCard
                label="Ubicación"
                value={businessForm.city || 'Pendiente'}
                detail={businessForm.fullAddress || 'Sumá la dirección completa'}
                icon="negocio"
                tone="warm"
              />
              <DashboardStatCard
                label="Canales"
                value={`${[businessForm.instagram, businessForm.facebook, businessForm.tiktok, businessForm.website, businessForm.whatsapp].filter(Boolean).length}`}
                detail="Vías de contacto configuradas"
                icon="share"
              />
            </div>

            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <DashboardSectionHeading
                title="Identidad"
                description="Nombre comercial, logo, banner y rubros principales."
              />
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Nombre</label>
                  <input
                    className={inputClassName}
                    name="businessName"
                    value={businessForm.businessName}
                    onChange={handleBusinessChange}
                    placeholder="Ej: Atelier Glow"
                  />
                </div>
                <ImageUploader
                  label="Logo"
                  value={businessForm.logoUrl}
                  onChange={(url) => {
                    setBusinessForm((prev) => ({
                      ...prev,
                      logoUrl: url,
                      logoMedia:
                        prev.logoUrl && prev.logoUrl === url
                          ? prev.logoMedia
                          : DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION,
                    }));
                    markBusinessDirty();
                  }}
                  kind="logo"
                  variant="circle"
                  hint="Recomendado: 512 x 512 px, formato cuadrado. jpg, png, webp. Máximo 1MB."
                  presentation={businessForm.logoMedia}
                  onPresentationChange={(logoMedia) => {
                    setBusinessForm((prev) => ({ ...prev, logoMedia }));
                    markBusinessDirty();
                  }}
                />
                <ImageUploader
                  label="Banner"
                  value={businessForm.bannerUrl}
                  onChange={(url) => {
                    setBusinessForm((prev) => ({
                      ...prev,
                      bannerUrl: url,
                      bannerMedia:
                        prev.bannerUrl && prev.bannerUrl === url
                          ? prev.bannerMedia
                          : DEFAULT_PROFESSIONAL_MEDIA_PRESENTATION,
                    }));
                    markBusinessDirty();
                  }}
                  kind="banner"
                  variant="banner"
                  hint="Recomendado: 1600 x 900 px (16:9), mínimo 1200 x 675 px. Mantené lo importante centrado. jpg, png, webp. Máximo 1MB."
                  presentation={businessForm.bannerMedia}
                  onPresentationChange={(bannerMedia) => {
                    setBusinessForm((prev) => ({ ...prev, bannerMedia }));
                    markBusinessDirty();
                  }}
                />
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Rubro</label>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#64748B]">Seleccioná uno o más rubros.</p>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                      {businessForm.categorySlugs.length} seleccionados
                    </p>
                  </div>
                  <div className="mt-2 max-h-[250px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {categories.map((category) => {
                        const checked = businessForm.categorySlugs.includes(category.slug);
                        return (
                          <label
                            key={category.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                              checked
                                ? 'border-[#1FB6A6] bg-[#1FB6A6]/12 text-[#0E2A47]'
                                : 'border-[#D7DEE8] bg-white text-[#334155] hover:border-[#A5B4C7] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggleCategory(category.slug)}
                              aria-label={`Rubro ${category.name}`}
                            />
                            <span
                              aria-hidden="true"
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.62rem] font-bold ${
                                checked
                                  ? 'border-[#1FB6A6] bg-[#1FB6A6] text-white'
                                  : 'border-[#C7D2E1] text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span className="truncate">{category.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <DashboardSectionHeading
                title="Descripción pública"
                description="Mensaje principal y texto sobre el negocio que aparecen en la página pública."
              />
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Mensaje principal</label>
                  <input
                    className={inputClassName}
                    name="headline"
                    value={publicForm.headline}
                    onChange={handlePublicChange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Sobre el negocio</label>
                  <textarea
                    className={`${inputClassName} h-28 resize-none`}
                    name="about"
                    value={publicForm.about}
                    onChange={handlePublicChange}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <DashboardSectionHeading
                title="Ubicación y contacto"
                description="Dirección, teléfono y canales públicos para que el cliente pueda llegar o escribir."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">País</label>
                  <input
                    className={inputClassName}
                    name="country"
                    value={businessForm.country}
                    onChange={(event) => void handleGeoFieldChange('country', event.target.value)}
                    placeholder="Ej: Argentina"
                  />
                  {activeGeoField === 'country' && geoSuggestions.length > 0 ? (
                    <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.country || 'country'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyGeoSuggestion(item)}
                        >
                          {(item.country || item.city || item.placeName || '').trim()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Ciudad</label>
                  <input
                    className={inputClassName}
                    name="city"
                    value={businessForm.city}
                    onChange={(event) => void handleGeoFieldChange('city', event.target.value)}
                    placeholder="Ej: Buenos Aires"
                  />
                  {activeGeoField === 'city' && geoSuggestions.length > 0 ? (
                    <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.city || 'city'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyGeoSuggestion(item)}
                        >
                          {(item.city || item.fullAddress || item.placeName || '').trim()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#0E2A47]">Dirección completa</label>
                  <input
                    className={inputClassName}
                    name="fullAddress"
                    value={businessForm.fullAddress}
                    onChange={(event) => void handleGeoFieldChange('fullAddress', event.target.value)}
                    placeholder="Ej: Av. Santa Fe 1234"
                  />
                  {activeGeoField === 'fullAddress' && (geoSuggestions.length > 0 || isGeoSuggesting) ? (
                    <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-[#E2E8F0] bg-white">
                      {isGeoSuggesting ? (
                        <p className="px-3 py-2 text-xs text-[#64748B]">Buscando sugerencias...</p>
                      ) : null}
                      {geoSuggestions.map((item, index) => (
                        <button
                          key={`${item.placeName || item.fullAddress || 'address'}-${index}`}
                          type="button"
                          className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0E2A47] last:border-b-0 hover:bg-[#F8FAFC]"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyGeoSuggestion(item)}
                        >
                          <span className="block font-medium">{(item.fullAddress || item.placeName || '').trim()}</span>
                          <span className="block text-xs text-[#64748B]">{[item.city, item.country].filter(Boolean).join(', ')}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#0E2A47]">Teléfono</label>
                  <div className="mt-1">
                    <InternationalPhoneField
                      value={businessForm.phone}
                      onChange={handlePhoneChange}
                      selectClassName={inputClassName}
                      inputClassName={inputClassName}
                      inputPlaceholder="11 2345 6789"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#64748B]">
                    El código del país se agrega automáticamente según la selección.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Instagram</label>
                  <input
                    className={inputClassName}
                    name="instagram"
                    value={businessForm.instagram}
                    onChange={handleBusinessChange}
                    placeholder="https://instagram.com/usuario"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Facebook</label>
                  <input
                    className={inputClassName}
                    name="facebook"
                    value={businessForm.facebook}
                    onChange={handleBusinessChange}
                    placeholder="https://facebook.com/pagina"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">TikTok</label>
                  <input
                    className={inputClassName}
                    name="tiktok"
                    value={businessForm.tiktok}
                    onChange={handleBusinessChange}
                    placeholder="https://tiktok.com/@usuario"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Sitio web</label>
                  <input
                    className={inputClassName}
                    name="website"
                    value={businessForm.website}
                    onChange={handleBusinessChange}
                    placeholder="https://miweb.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#0E2A47]">WhatsApp</label>
                  <input
                    className={inputClassName}
                    name="whatsapp"
                    value={businessForm.whatsapp}
                    onChange={handleBusinessChange}
                    placeholder="https://wa.me/598XXXXXXXX"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DashboardSectionHeading
                  title="Galería pública"
                  description={`Máximo ${maxBusinessPhotos} fotos. Estas son las únicas fotos que se muestran en la galería pública.`}
                />
                <button
                  type="button"
                  onClick={addPhoto}
                  disabled={!canAddPhoto}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    canAddPhoto
                      ? 'border-[#E2E7EC] bg-white text-[#0E2A47] hover:-translate-y-0.5 hover:shadow-sm'
                      : 'cursor-not-allowed border-[#E2E7EC] bg-[#F4F6F8] text-[#94A3B8]'
                  }`}
                >
                  Agregar foto ({filledPhotoCount}/{maxBusinessPhotos})
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {photos.map((photo, index) => (
                  <div key={photo.id}>
                    <ImageUploader
                      value={photo.url}
                      onChange={(url) => handlePhotoUrlChange(index, url)}
                      kind="gallery"
                      variant="square"
                      label={`Foto ${index + 1}`}
                    />
                    {photo.url ? (
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="mt-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        Eliminar foto
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-white/70 bg-white/95 p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <DashboardSectionHeading
                title="Compartir página"
                description="Usá este link o QR para compartir tu ficha y atraer reservas directas."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr,1fr,180px]">
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Slug</label>
                  <input className={inputClassName} value={slug} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">Link</label>
                  <input className={inputClassName} value={publicUrl} readOnly />
                </div>
                <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(publicUrl)}`}
                    alt="QR de la página pública"
                    className="h-32 w-32"
                  />
                  <p className="mt-2 text-xs text-[#94A3B8]">QR de tu página</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </ProfessionalDashboardShell>
  );
}
