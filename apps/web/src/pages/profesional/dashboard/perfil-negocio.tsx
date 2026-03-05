'use client';

import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useCategories } from '@/hooks/useCategories';
import api from '@/services/api';
import { isAxiosError } from 'axios';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { mapboxForwardGeocode } from '@/services/mapbox';

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
  latitude?: number;
  longitude?: number;
  email: string;
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
  const [form, setForm] = useState<BusinessProfileForm>({
    businessName: '',
    categorySlugs: [] as string[],
    logoUrl: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    email: '',
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
      latitude: typeof profile.latitude === 'number' ? profile.latitude : undefined,
      longitude: typeof profile.longitude === 'number' ? profile.longitude : undefined,
      email: profile.email || '',
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
      ...(name === 'location'
        ? {
            latitude: undefined,
            longitude: undefined,
          }
        : {}),
    }));
    setIsDirty(true);
    setSaveMessage(null);
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
      const normalizedLocation = form.location.trim();

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
        latitude: normalizedPayload.latitude ?? undefined,
        longitude: normalizedPayload.longitude ?? undefined,
        email: form.email,
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
      <div className="flex min-h-screen flex-col">
        <Navbar
          variant="dashboard"
          showMenuButton
          onMenuClick={handleToggleMenu}
        />
        <div className="flex flex-1">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Perfil del negocio" />
            </div>
          </aside>
          <div className="flex-1">
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Perfil del negocio" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Configuración
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Perfil del negocio
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Datos que se muestran en tu página pública.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
              {saveMessage ? (
                <p className={`mt-3 text-sm font-medium ${saveError ? 'text-red-500' : 'text-[#1FB6A6]'}`}>
                  {saveMessage}
                </p>
              ) : null}
              {isDirty && !saveMessage ? (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  Tenés cambios sin guardar.
                </p>
              ) : null}
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
                  <h2 className="text-lg font-semibold text-[#0E2A47]">
                    Identidad
                  </h2>
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
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <h2 className="text-lg font-semibold text-[#0E2A47]">
                    Contacto
                  </h2>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#0E2A47]">
                        Ubicación
                      </label>
                      <input
                        className={inputClassName}
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        placeholder="Ej: Palermo, Buenos Aires"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Email
                        </label>
                        <input
                          className={`${inputClassName} bg-[#F8FAFC] text-[#64748B]`}
                          name="email"
                          value={form.email}
                          readOnly
                          placeholder="Ej: hola@plura.com"
                        />
                      </div>
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
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                  <h2 className="text-lg font-semibold text-[#0E2A47]">
                    Redes sociales
                  </h2>
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
    </div>
  );
}
