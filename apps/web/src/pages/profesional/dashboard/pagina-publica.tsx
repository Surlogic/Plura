'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { resolveProfessionalFeatureAccess } from '@/lib/billing/featureGuards';
import api from '@/services/api';
import ImageUploader from '@/components/profesional/dashboard/ImageUploader';
import { resolveAssetUrl } from '@/utils/assetUrl';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import { nextPlanFor, PLAN_LABELS } from '../../../../../../packages/shared/src/billing/planAccess';
import type {
  ProfessionalSchedule,
  PublicService,
} from '@/types/professional';

type PhotoItem = {
  id: string;
  url: string;
};

type PublicPageForm = {
  headline: string;
  about: string;
};

const createEmptyPhotos = (count = 1): PhotoItem[] =>
  Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `photo-${index + 1}`,
    url: '',
  }));

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

export default function ProfesionalPublicPageBuilder() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const featureAccess = resolveProfessionalFeatureAccess(profile);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [origin, setOrigin] = useState('https://plura.com');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasLoadedPage, setHasLoadedPage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [services, setServices] = useState<PublicService[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [form, setForm] = useState<PublicPageForm>({
    headline: '',
    about: '',
  });
  const [initialForm, setInitialForm] = useState<PublicPageForm | null>(null);
  const maxBusinessPhotos = profile?.professionalEntitlements?.maxBusinessPhotos ?? 3;
  const [photos, setPhotos] = useState<PhotoItem[]>(createEmptyPhotos());
  const [initialPhotos, setInitialPhotos] = useState<PhotoItem[] | null>(null);

  const displayName = profile?.fullName || '';
  const displayCategory = profile?.rubro || '';
  const resolvedSlug = profile?.slug?.trim() || slugify(displayName || 'profesional');
  const slug = useMemo(
    () => resolvedSlug || 'profesional',
    [resolvedSlug],
  );
  const publicUrl = `${origin}/profesional/pagina/${slug || 'profesional'}`;
  const showSkeleton = !hasLoaded || (isLoading && !profile);
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
  const canAddPhoto = photos.length < maxBusinessPhotos;
  const canManageEnhancedContent = featureAccess.enhancedPublicProfile;
  const filledPhotoCount = useMemo(
    () => photos.filter((photo) => photo.url).length,
    [photos],
  );
  const previewPayload = useMemo(
    () => ({
      type: 'plura-preview',
      payload: {
        name: displayName,
        category: displayCategory,
        logoUrl: resolveAssetUrl(profile?.logoUrl || ''),
        bannerUrl: resolveAssetUrl(profile?.bannerUrl || ''),
        headline: form.headline,
        about: form.about,
        photos: photos.map((photo) => photo.url).filter(Boolean).map((url) => resolveAssetUrl(url)).filter(Boolean),
        services: previewServices,
        schedule,
      },
    }),
    [
      displayCategory,
      displayName,
      form.about,
      form.headline,
      photos,
      profile?.logoUrl,
      profile?.bannerUrl,
      previewServices,
      schedule,
    ],
  );

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
    if (!iframeReady) return;
    if (typeof window === 'undefined') return;
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;
    targetWindow.postMessage(previewPayload, window.location.origin);
  }, [iframeReady, previewPayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    api
      .get<PublicService[]>('/profesional/services')
      .then((response) => {
        setServices(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        setServices([]);
      });
    api
      .get<ProfessionalSchedule>('/profesional/schedule')
      .then((response) => {
        const data = response.data;
        if (!data || !Array.isArray(data.days)) {
          setSchedule(null);
          return;
        }
        setSchedule({
          days: data.days,
          pauses: Array.isArray(data.pauses) ? data.pauses : [],
        });
      })
      .catch(() => {
        setSchedule(null);
      });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || hasLoadedPage) return;
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
        setForm(loadedForm);
        setInitialForm(loadedForm);
        setPhotos(loadedPhotos);
        setInitialPhotos(loadedPhotos);
        setIsDirty(false);
      })
      .catch(() => {
        setSaveMessage('No se pudo cargar la información. Intentá recargar la página.');
        setSaveError(true);
      })
      .finally(() => {
        setHasLoadedPage(true);
      });
  }, [profile, hasLoadedPage, maxBusinessPhotos]);

  const inputClassName =
    'h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]';

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handlePhotoUrlChange = (index: number, url: string) => {
    setPhotos((prev) =>
      prev.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, url } : photo,
      ),
    );
    setIsDirty(true);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
    setIsDirty(true);
  };

  const addPhoto = () => {
    setPhotos((prev) => {
      if (prev.length >= maxBusinessPhotos) return prev;
      setIsDirty(true);
      return [...prev, { id: `photo-${prev.length + 1}`, url: '' }];
    });
  };

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      const persistedPhotos = photos.map((photo) => photo.url).filter(Boolean);
      await api.put('/profesional/public-page', {
        ...(canManageEnhancedContent ? {
          headline: form.headline,
          about: form.about,
        } : {}),
        photos: persistedPhotos,
      });
      const nextForm: PublicPageForm = {
        headline: canManageEnhancedContent ? form.headline : (initialForm?.headline ?? form.headline),
        about: canManageEnhancedContent ? form.about : (initialForm?.about ?? form.about),
      };
      const nextPhotos = photos.map((photo, index) => ({
        id: photo.id || `photo-${index + 1}`,
        url: photo.url,
      }));
      setForm(nextForm);
      setInitialForm(nextForm);
      setPhotos(nextPhotos);
      setInitialPhotos(nextPhotos);
      setSaveMessage('Guardado correctamente.');
      setSaveError(false);
      setIsDirty(false);
      return true;
    } catch {
      setSaveMessage('No se pudo guardar. Intentá de nuevo.');
      setSaveError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [canManageEnhancedContent, form, initialForm, isSaving, photos]);

  const handleReset = useCallback(() => {
    if (!initialForm || !initialPhotos) return;
    setForm(initialForm);
    setPhotos(initialPhotos);
    setIsDirty(false);
    setSaveMessage(null);
    setSaveError(false);
  }, [initialForm, initialPhotos]);

  useProfessionalDashboardUnsavedSection({
    sectionId: 'public-page',
    isDirty,
    isSaving,
    onSave: handleSave,
    onReset: handleReset,
  });

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
          <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Página pública" />
            </div>
          </aside>
          <div className="flex-1">
            <div className="px-4 pt-4 sm:px-6 lg:hidden">
              <Button type="button" size="sm" onClick={handleToggleMenu}>
                {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              </Button>
            </div>
            {isMenuOpen ? (
              <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]/92 backdrop-blur-xl lg:hidden">
                <ProfesionalSidebar profile={profile} active="Página pública" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="space-y-6">
            <DashboardHero
              eyebrow="Escaparate"
              icon="publica"
              accent="teal"
              title="Página pública y preview en un solo flujo"
              description="Ajustá el mensaje, la galería y la presentación general con foco en cómo se verá la ficha final para el cliente."
              meta={
                <>
                  <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                    {services.length} servicios visibles
                  </span>
                  <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                    {filledPhotoCount} fotos cargadas
                  </span>
                  {isDirty ? (
                    <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                      Cambios sin guardar
                    </span>
                  ) : null}
                </>
              }
              actions={(
                <Button
                  type="button"
                  variant="contrast"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
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

            {showSkeleton ? (
              <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="h-5 w-48 rounded-full bg-[#E2E7EC]" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[0.86fr,1.14fr]">
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DashboardStatCard
                      label="Slug"
                      value={slug}
                      detail="Identidad pública de la ficha"
                      icon="share"
                      tone="accent"
                      className="sm:col-span-2"
                    />
                    <DashboardStatCard
                      label="Fotos"
                      value={`${filledPhotoCount}/${maxBusinessPhotos}`}
                      detail="Galería del negocio"
                      icon="publica"
                    />
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <DashboardSectionHeading
                      title="Frase principal"
                      description="Es la promesa principal que aparece debajo del nombre en la ficha pública."
                    />
                    <div className="mt-4">
                      <input
                        className={inputClassName}
                        name="headline"
                        value={form.headline}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center justify-between">
                      <DashboardSectionHeading
                        title="Fotos del negocio o trabajos"
                        description={`Máximo ${maxBusinessPhotos} fotos. Las imágenes de servicios se suman después en la galería pública.${
                          nextPlanFor(profile?.professionalPlan)
                            ? ` Con el plan ${PLAN_LABELS[nextPlanFor(profile?.professionalPlan)!]} podés subir más.`
                            : ''
                        }`}
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
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <DashboardSectionHeading
                      title="Sobre mí"
                      description="Contá quién sos, qué hacés y qué tipo de experiencia van a encontrar tus clientes."
                    />
                    <div className="mt-4">
                      <textarea
                        className={`${inputClassName} h-28 resize-none`}
                        name="about"
                        value={form.about}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)] xl:sticky xl:top-6">
                    <DashboardSectionHeading
                      eyebrow="Vista previa"
                      title="Página pública"
                      description="El resultado final se actualiza a medida que ajustás textos, fotos y narrativa."
                      action={(
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                        >
                          Ir al sitio
                        </a>
                      )}
                    />
                    <div className="mt-5 overflow-hidden rounded-[22px] border border-[#E2E7EC] bg-white">
                      <iframe
                        ref={iframeRef}
                        title="Vista previa página pública"
                        src="/profesional/pagina/preview?preview=1"
                        sandbox="allow-scripts allow-same-origin"
                        referrerPolicy="no-referrer"
                        className="h-[780px] w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <DashboardSectionHeading
                      title="URL pública"
                      description="Usá este link o QR para compartir tu ficha y atraer reservas directas."
                    />
                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Slug
                        </label>
                        <input className={inputClassName} value={slug} readOnly />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Link
                        </label>
                        <input
                          className={inputClassName}
                          value={publicUrl}
                          readOnly
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                            publicUrl,
                          )}`}
                          alt="QR de la página pública"
                          className="h-32 w-32"
                        />
                        <p className="mt-2 text-xs text-[#94A3B8]">
                          QR de tu página
                        </p>
                      </div>
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
