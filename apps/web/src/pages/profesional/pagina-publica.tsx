'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  buildServicePreview,
  loadProfessionalServices,
} from '@/lib/professionalServices';
import { loadProfessionalSchedule } from '@/lib/professionalSchedule';
import api from '@/services/api';
import { getProfessionalToken } from '@/services/session';
import type {
  ProfessionalSchedule,
  ProfessionalService,
  PublicService,
} from '@/types/professional';

type PhotoItem = {
  id: string;
  url: string;
};

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
  const router = useRouter();
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingRouteRef = useRef<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [origin, setOrigin] = useState('https://plura.com');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [hasLoadedPage, setHasLoadedPage] = useState(false);
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [schedule, setSchedule] = useState<ProfessionalSchedule | null>(null);
  const [form, setForm] = useState({
    headline: '',
    about: '',
  });
  const maxBusinessPhotos = 5;
  const [photos, setPhotos] = useState<PhotoItem[]>([
    { id: 'photo-1', url: '' },
    { id: 'photo-2', url: '' },
    { id: 'photo-3', url: '' },
    { id: 'photo-4', url: '' },
  ]);

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
    () => services.map(buildServicePreview),
    [services],
  );
  const canAddPhoto = photos.length < maxBusinessPhotos;
  const previewPayload = useMemo(
    () => ({
      type: 'plura-preview',
      payload: {
        name: displayName,
        category: displayCategory,
        headline: form.headline,
        about: form.about,
        photos: photos.map((photo) => photo.url).filter(Boolean),
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
    if (!slug || !profile?.id || typeof window === 'undefined') return;
    if (previewServices.length === 0) return;
    window.localStorage.setItem(
      `plura:public-services:${slug}`,
      JSON.stringify(previewServices),
    );
  }, [slug, previewServices, profile?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    setServices(loadProfessionalServices(profile.id));
    setSchedule(loadProfessionalSchedule(profile.id, { allowFallback: false }));
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || hasLoadedPage) return;
    const token = getProfessionalToken();
    if (!token) return;

    api
      .get('/profesional/public-page', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const data = response.data as {
          headline?: string | null;
          about?: string | null;
          photos?: string[] | null;
        };
        setForm((prev) => ({
          headline: data.headline ?? prev.headline,
          about: data.about ?? prev.about,
        }));
        if (data.photos && data.photos.length > 0) {
          setPhotos(
            data.photos.slice(0, maxBusinessPhotos).map((url, index) => ({
              id: `photo-${index + 1}`,
              url,
            })),
          );
        }
      })
      .catch(() => {
        setSaveMessage('No se pudo cargar la información. Intentá recargar la página.');
        setSaveError(true);
      })
      .finally(() => {
        setHasLoadedPage(true);
      });
  }, [profile, hasLoadedPage]);

  // Warn before closing/reloading the browser tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept Next.js in-app navigation
  useEffect(() => {
    if (!isDirty) return;
    const handleRouteStart = (url: string) => {
      pendingRouteRef.current = url;
      setShowExitWarning(true);
      router.events.emit('routeChangeError');
      throw 'routeChange aborted.';
    };
    router.events.on('routeChangeStart', handleRouteStart);
    return () => router.events.off('routeChangeStart', handleRouteStart);
  }, [isDirty, router.events]);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handlePhotoChange = (index: number, value: string) => {
    setPhotos((prev) =>
      prev.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, url: value } : photo,
      ),
    );
    setIsDirty(true);
  };

  const addPhoto = () => {
    setPhotos((prev) => {
      if (prev.length >= maxBusinessPhotos) return prev;
      return [...prev, { id: `photo-${prev.length + 1}`, url: '' }];
    });
  };

  const handleSave = async () => {
    const token = getProfessionalToken();
    if (!token) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      await api.put(
        '/profesional/public-page',
        {
          headline: form.headline,
          about: form.about,
          photos: photos.map((photo) => photo.url).filter(Boolean),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSaveMessage('Guardado correctamente.');
      setSaveError(false);
      setIsDirty(false);
    } catch (error) {
      setSaveMessage('No se pudo guardar. Intentá de nuevo.');
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmExit = () => {
    setIsDirty(false);
    setShowExitWarning(false);
    const url = pendingRouteRef.current;
    pendingRouteRef.current = null;
    if (url) void router.push(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      {isSaving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1D2A]/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white px-10 py-8 shadow-[0_28px_70px_rgba(15,23,42,0.25)]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E2E7EC] border-t-[#1FB6A6]" />
            <p className="text-sm font-semibold text-[#0E2A47]">Guardando cambios...</p>
          </div>
        </div>
      ) : null}

      {showExitWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1D2A]/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_28px_70px_rgba(15,23,42,0.25)]">
            <h3 className="text-lg font-semibold text-[#0E2A47]">Cambios sin guardar</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              Tenés cambios que no guardaste. ¿Querés salir de todos modos?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={() => setShowExitWarning(false)}
                className="flex-1 rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="flex flex-col lg:flex-row items-start gap-6 lg:pl-[300px]">
          <ProfesionalSidebar profile={profile} active="Página pública" />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Página pública
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Constructor de marketplace
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Configurá la información que verán los clientes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isDirty ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                      Sin guardar
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
              {saveMessage ? (
                <p className={`mt-3 text-sm font-medium ${saveError ? 'text-red-500' : 'text-[#1FB6A6]'}`}>
                  {saveMessage}
                </p>
              ) : null}
            </div>

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
              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      Frase principal
                    </h2>
                    <p className="mt-1 text-sm text-[#64748B]">
                      La frase que aparece debajo del nombre en tu página pública.
                    </p>
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
                      <div>
                        <h2 className="text-lg font-semibold text-[#0E2A47]">
                          Fotos del negocio o trabajos
                        </h2>
                        <p className="text-xs text-[#64748B]">
                          Máximo {maxBusinessPhotos} fotos. Las fotos de servicios se
                          suman debajo en la galería pública.
                        </p>
                      </div>
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
                        Agregar foto ({photos.length}/{maxBusinessPhotos})
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {photos.map((photo, index) => (
                        <div key={photo.id} className="space-y-2">
                          <div
                            className="h-28 rounded-[18px] border border-[#E2E7EC] bg-[#F4F6F8] bg-cover bg-center"
                            style={{
                              backgroundImage: photo.url
                                ? `url("${photo.url}")`
                                : undefined,
                            }}
                          />
                          <input
                            className={inputClassName}
                            placeholder="Pegá la URL de la foto"
                            value={photo.url}
                            onChange={(event) =>
                              handlePhotoChange(index, event.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      Sobre mí
                    </h2>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Contá quién sos y qué hacés.
                    </p>
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
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <h2 className="text-lg font-semibold text-[#0E2A47]">
                      URL pública
                    </h2>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Usá este link o QR para compartir tu página.
                    </p>
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

                  <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Vista previa
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-[#0E2A47]">
                        Página pública
                      </h2>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        Ir al sitio
                      </a>
                    </div>
                    <div className="mt-5 overflow-hidden rounded-[22px] border border-[#E2E7EC] bg-white">
                      <iframe
                        ref={iframeRef}
                        title="Vista previa página pública"
                        src="/profesional/pagina/preview?preview=1"
                        className="h-[720px] w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
