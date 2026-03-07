'use client';

import { useCallback, useEffect, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useCategories } from '@/hooks/useCategories';
import api from '@/services/api';
import { isAxiosError } from 'axios';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getGeoLocationSuggestions, type GeoLocationSuggestion } from '@/services/geo';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';

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
  'tratamientos-corporales': 'tratamientos-corporales',
  'medicina-estetica': 'medicina-estetica',
  'bienestar-holistico': 'bienestar-holistico',
};

const dedupeSlugs = (slugs: string[]) =>
  Array.from(
    new Set(
      slugs
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  );

type BusinessProfileForm = {
  businessName: string;
  categorySlugs: string[];
  logoUrl: string;
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

export default function ProfesionalBusinessProfilePage() {
  const { profile, isLoading, hasLoaded, refreshProfile } = useProfessionalProfile();
  const { categories, isLoading: isLoadingCategories } = useCategories();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [isGeoSuggesting, setIsGeoSuggesting] = useState(false);
  const [activeGeoField, setActiveGeoField] = useState<'country' | 'city' | 'fullAddress' | null>(null);
  const [geoSuggestions, setGeoSuggestions] = useState<GeoLocationSuggestion[]>([]);
  const [form, setForm] = useState<BusinessProfileForm>({
    businessName: '',
    categorySlugs: [] as string[],
    logoUrl: '',
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
  const [initialForm, setInitialForm] = useState<BusinessProfileForm | null>(null);

  useEffect(() => {
    if (!profile || hasInitialized) return;
    const hasProfileCategories =
      Array.isArray(profile.categories) && profile.categories.length > 0;
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

    setForm(initialData);
    setInitialForm(initialData);
    setIsDirty(false);
    setHasInitialized(true);
  }, [profile, hasInitialized, categories, isLoadingCategories]);

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'location' || name === 'country' || name === 'city' || name === 'fullAddress'
        ? {
            latitude: undefined,
            longitude: undefined,
          }
        : {}),
    }));
    setIsDirty(true);
    setSaveMessage(null);
  };

  const handleGeoFieldChange = async (
    field: 'country' | 'city' | 'fullAddress',
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      latitude: undefined,
      longitude: undefined,
    }));
    setActiveGeoField(field);
    setIsDirty(true);
    setSaveMessage(null);
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

    setForm((prev) => ({
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
    setIsDirty(true);
  };

  const toggleCategory = (slug: string) => {
    setForm((prev) => {
      const selected = prev.categorySlugs.includes(slug);
      return {
        ...prev,
        categorySlugs: selected
          ? prev.categorySlugs.filter((value) => value !== slug)
          : [...prev.categorySlugs, slug],
      };
    });
    setIsDirty(true);
    setSaveMessage(null);
  };

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;
    if (!form.businessName.trim() || !form.phone.trim()) {
      setSaveMessage('Completá nombre, rubro y teléfono para guardar.');
      setSaveError(true);
      return false;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      const categoryNameBySlug = new Map(
        categories.map((category) => [category.slug, category.name]),
      );
      const validCategorySlugs = dedupeSlugs(form.categorySlugs).filter((slug) =>
        categoryNameBySlug.has(slug),
      );
      if (validCategorySlugs.length === 0) {
        setSaveMessage('Seleccioná al menos un rubro válido para guardar.');
        setSaveError(true);
        setIsSaving(false);
        return false;
      }

      const primaryCategoryName = categoryNameBySlug.get(validCategorySlugs[0]) || '';
      const normalizedCountry = form.country.trim();
      const normalizedCity = form.city.trim();
      const normalizedFullAddress = form.fullAddress.trim();
      const normalizedLocation = [normalizedFullAddress, normalizedCity, normalizedCountry]
        .filter(Boolean)
        .join(', ');

      if (!normalizedCountry || !normalizedCity || !normalizedFullAddress) {
        setSaveMessage('Completá país, ciudad y dirección completa para guardar.');
        setSaveError(true);
        setIsSaving(false);
        return false;
      }

      let latitude: number | null =
        typeof form.latitude === 'number' ? form.latitude : null;
      let longitude: number | null =
        typeof form.longitude === 'number' ? form.longitude : null;

      if (normalizedLocation) {
        const needsGeocoding =
          !initialForm ||
          normalizedLocation.toLocaleLowerCase('es-UY') !==
            initialForm.location.trim().toLocaleLowerCase('es-UY') ||
          latitude === null ||
          longitude === null;

        if (needsGeocoding) {
          const geocoded = await mapboxForwardGeocode(normalizedLocation);
          if (!geocoded) {
            setSaveMessage(
              'No pudimos ubicar esa dirección. Revisala antes de guardar.',
            );
            setSaveError(true);
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
        fullName: form.businessName.trim(),
        rubro: primaryCategoryName,
        categorySlugs: validCategorySlugs,
        logoUrl: form.logoUrl.trim(),
        location: normalizedLocation,
        country: normalizedCountry,
        city: normalizedCity,
        fullAddress: normalizedFullAddress,
        latitude,
        longitude,
        phoneNumber: form.phone.trim(),
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        tiktok: form.tiktok.trim(),
        website: form.website.trim(),
        whatsapp: form.whatsapp.trim(),
      };
      await api.put('/profesional/profile', {
        ...normalizedPayload,
      });
      void refreshProfile();
      const persistedForm: BusinessProfileForm = {
        businessName: normalizedPayload.fullName,
        categorySlugs: normalizedPayload.categorySlugs,
        logoUrl: normalizedPayload.logoUrl,
        location: normalizedPayload.location,
        country: normalizedPayload.country,
        city: normalizedPayload.city,
        fullAddress: normalizedPayload.fullAddress,
        latitude: normalizedPayload.latitude ?? undefined,
        longitude: normalizedPayload.longitude ?? undefined,
        phone: normalizedPayload.phoneNumber,
        instagram: normalizedPayload.instagram || '',
        facebook: normalizedPayload.facebook || '',
        tiktok: normalizedPayload.tiktok || '',
        website: normalizedPayload.website || '',
        whatsapp: normalizedPayload.whatsapp || '',
      };
      setForm(persistedForm);
      setInitialForm(persistedForm);
      setSaveMessage('Perfil actualizado correctamente.');
      setSaveError(false);
      setIsDirty(false);
      return true;
    } catch (error) {
      const backendMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setSaveMessage(
        backendMessage && backendMessage.trim()
          ? backendMessage.trim()
          : 'No se pudo guardar el perfil del negocio.',
      );
      setSaveError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [categories, form, initialForm, isSaving, refreshProfile]);

  const handleReset = useCallback(() => {
    if (!initialForm) return;
    setForm(initialForm);
    setIsDirty(false);
    setSaveMessage(null);
    setSaveError(false);
  }, [initialForm]);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'business-profile',
    isDirty,
    isSaving,
    onSave: handleSave,
    onReset: handleReset,
  });
  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Perfil del negocio" />
            </div>
          </aside>
          <div className="flex-1">
            <div className="px-4 pt-4 sm:px-6 lg:hidden">
              <Button type="button" size="sm" onClick={handleToggleMenu}>
                {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              </Button>
            </div>
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Perfil del negocio" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="space-y-6">
            <DashboardHero
              eyebrow="Presencia pública"
              icon="negocio"
              accent="teal"
              title="Identidad comercial, ubicación y canales de contacto"
              description="Definí cómo se presenta tu negocio en la ficha pública y asegurate de que los clientes encuentren rápido tu propuesta, tu dirección y tus vías de contacto."
              meta={
                <>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                    {form.categorySlugs.length} rubros
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                    {form.city || 'Sin ciudad'}
                  </span>
                  {isDirty ? (
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                      Cambios sin guardar
                    </span>
                  ) : null}
                </>
              }
              actions={(
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/14"
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            />

            {saveMessage ? (
              <p className={`rounded-full border px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] ${
                saveError
                  ? 'border-red-200 bg-red-50 text-red-500'
                  : 'border-[#cdeee9] bg-[#f0fffc] text-[#1FB6A6]'
              }`}>
                {saveMessage}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <DashboardStatCard
                label="Rubros"
                value={`${form.categorySlugs.length}`}
                detail="Categorías activas para descubrimiento"
                icon="spark"
                tone="accent"
              />
              <DashboardStatCard
                label="Canales"
                value={`${[form.instagram, form.facebook, form.tiktok, form.website, form.whatsapp].filter(Boolean).length}`}
                detail="Vías de contacto configuradas"
                icon="share"
              />
              <DashboardStatCard
                label="Ubicación"
                value={form.city || 'Pendiente'}
                detail={form.fullAddress || 'Sumá la dirección completa'}
                icon="negocio"
                tone="warm"
              />
            </div>

            {showSkeleton ? (
              <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="h-5 w-40 rounded-full bg-[#E2E7EC]" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <DashboardSectionHeading
                    title="Identidad"
                    description="Nombre comercial, logo y rubros principales."
                  />
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Nombre
                      </label>
                      <input
                        className={inputClassName}
                        name="businessName"
                        value={form.businessName}
                        onChange={handleChange}
                        placeholder="Ej: Atelier Glow"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Logo (URL)
                      </label>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E2E7EC] bg-[#F8FAFC] text-xs font-semibold text-[#94A3B8]">
                          {form.logoUrl.trim() ? (
                            <img
                              src={form.logoUrl.trim()}
                              alt="Logo del negocio"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            'LOGO'
                          )}
                        </div>
                        <input
                          className={inputClassName}
                          name="logoUrl"
                          value={form.logoUrl}
                          onChange={handleChange}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Rubro
                      </label>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-[#64748B]">
                          Seleccioná uno o más rubros.
                        </p>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                          {form.categorySlugs.length} seleccionados
                        </p>
                      </div>
                      <div className="mt-2 max-h-[250px] overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {categories.map((category) => {
                            const checked = form.categorySlugs.includes(category.slug);
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
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">País</label>
                          <input
                            className={inputClassName}
                            name="country"
                            value={form.country}
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
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applyGeoSuggestion(item);
                                  }}
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
                            value={form.city}
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
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">Dirección completa</label>
                          <input
                            className={inputClassName}
                            name="fullAddress"
                            value={form.fullAddress}
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
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applyGeoSuggestion(item);
                                  }}
                                >
                                  <span className="block font-medium">{(item.fullAddress || item.placeName || '').trim()}</span>
                                  <span className="block text-xs text-[#64748B]">{[item.city, item.country].filter(Boolean).join(', ')}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <DashboardSectionHeading
                    title="Contacto"
                    description="Datos directos para que el cliente pueda escribir o llamar."
                  />
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Teléfono
                      </label>
                      <input
                        className={inputClassName}
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Ej: +54 11 5555 4444"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <DashboardSectionHeading
                    title="Redes sociales"
                    description="Canales que refuerzan confianza y derivan tráfico."
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Instagram
                      </label>
                      <input
                        className={inputClassName}
                        name="instagram"
                        value={form.instagram}
                        onChange={handleChange}
                        placeholder="https://instagram.com/usuario"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Facebook
                      </label>
                      <input
                        className={inputClassName}
                        name="facebook"
                        value={form.facebook}
                        onChange={handleChange}
                        placeholder="https://facebook.com/pagina"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        TikTok
                      </label>
                      <input
                        className={inputClassName}
                        name="tiktok"
                        value={form.tiktok}
                        onChange={handleChange}
                        placeholder="https://tiktok.com/@usuario"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Sitio web
                      </label>
                      <input
                        className={inputClassName}
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https://miweb.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-[#0E2A47]">
                        WhatsApp
                      </label>
                      <input
                        className={inputClassName}
                        name="whatsapp"
                        value={form.whatsapp}
                        onChange={handleChange}
                        placeholder="https://wa.me/598XXXXXXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </main>
          </div>
        </div>
    </div>
  );
}
