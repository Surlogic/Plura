'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  loadProfessionalServices,
  saveProfessionalServices,
} from '@/lib/professionalServices';
import type {
  ProfessionalService,
  ServicePaymentType,
  ServicePhoto,
} from '@/types/professional';

const maxServicePhotos = 3;

const paymentOptions: Array<{
  value: ServicePaymentType;
  label: string;
  description: string;
}> = [
  {
    value: 'full',
    label: 'Pago completo',
    description: 'El cliente paga todo al reservar.',
  },
  {
    value: 'deposit',
    label: 'Solo seña',
    description: 'Se cobra un anticipo para confirmar.',
  },
  {
    value: 'on_site',
    label: 'Paga en el local',
    description: 'Se cobra al finalizar el servicio.',
  },
];

const ensureDraftPhotos = (photos: ServicePhoto[] = []): ServicePhoto[] => {
  const trimmed = photos.slice(0, maxServicePhotos).map((photo, index) => ({
    id: photo.id || `photo-${index + 1}`,
    url: photo.url || '',
  }));
  while (trimmed.length < 2) {
    trimmed.push({ id: `photo-${trimmed.length + 1}`, url: '' });
  }
  return trimmed;
};

const createEmptyService = (index: number): ProfessionalService => ({
  id: `service-${Date.now()}-${index}`,
  name: '',
  price: '',
  duration: '',
  bufferTime: '',
  paymentType: 'full',
  photos: ensureDraftPhotos(),
});

export default function ProfesionalServicesBuilderPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [draft, setDraft] = useState<ProfessionalService>(createEmptyService(1));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!profile?.id || hasInitialized) return;
    const stored = loadProfessionalServices(profile.id);
    setServices(stored.length > 0 ? stored : []);
    setDraft(createEmptyService(stored.length + 1));
    setHasInitialized(true);
  }, [profile?.id, hasInitialized]);

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const handleDraftChange = (updates: Partial<ProfessionalService>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleDraftPhotoChange = (photoIndex: number, value: string) => {
    setDraft((prev) => {
      const updatedPhotos = prev.photos.map((photo, index) =>
        index === photoIndex ? { ...photo, url: value } : photo,
      );
      return { ...prev, photos: updatedPhotos };
    });
  };

  const addDraftPhoto = () => {
    setDraft((prev) => {
      if (prev.photos.length >= maxServicePhotos) return prev;
      return {
        ...prev,
        photos: [
          ...prev.photos,
          { id: `photo-${prev.photos.length + 1}`, url: '' },
        ],
      };
    });
  };

  const resetDraft = () => {
    setDraft(createEmptyService(services.length + 1));
    setEditingId(null);
  };

  const persistServices = (
    nextServices: ProfessionalService[],
    message: string,
  ) => {
    if (!profile?.id) return;
    try {
      saveProfessionalServices(profile.id, nextServices);
      setSaveMessage(message);
      setSaveError(false);
      setServices(nextServices);
    } catch {
      setSaveMessage('No se pudieron guardar. Intentá de nuevo.');
      setSaveError(true);
    }
  };

  const handleEditService = (service: ProfessionalService) => {
    setDraft({ ...service, photos: ensureDraftPhotos(service.photos) });
    setEditingId(service.id);
  };

  const handleTogglePause = (serviceId: string) => {
    const nextServices = services.map((service) =>
      service.id === serviceId ? { ...service, paused: !service.paused } : service,
    );
    persistServices(nextServices, 'Servicio actualizado.');
  };

  const handleDeleteService = (serviceId: string) => {
    const nextServices = services.filter((service) => service.id !== serviceId);
    persistServices(nextServices, 'Servicio eliminado.');
    if (editingId === serviceId) resetDraft();
  };

  const handleSubmitService = () => {
    if (!profile?.id) return;
    if (!draft.name.trim()) {
      setSaveMessage('El servicio debe tener un nombre.');
      return;
    }
    if (editingId) {
      const nextServices = services.map((service) =>
        service.id === editingId ? { ...draft, id: editingId } : service,
      );
      persistServices(nextServices, 'Servicio actualizado correctamente.');
      resetDraft();
      return;
    }

    const nextServices = [...services, draft];
    persistServices(nextServices, 'Servicio creado correctamente.');
    resetDraft();
  };

  const handleSave = () => {
    if (!profile?.id) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      saveProfessionalServices(profile.id, services);
      setSaveMessage('Servicios guardados correctamente.');
      setSaveError(false);
    } catch {
      setSaveMessage('No se pudieron guardar. Intentá de nuevo.');
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const servicePhotos = useMemo(
    () =>
      services
        .flatMap((service) => service.photos)
        .map((photo) => photo.url)
        .filter(Boolean),
    [services],
  );

  const serviceCount = services.length;

  const normalizeDurationLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/[a-zA-Z]/.test(trimmed)) return trimmed;
    const minutes = Number(trimmed);
    if (!Number.isFinite(minutes)) return trimmed;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);
    if (remaining === 0) return `${hours} h`;
    return `${hours} h ${remaining} min`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="flex flex-col lg:flex-row items-start gap-6 lg:pl-[300px]">
          <ProfesionalSidebar profile={profile} active="Servicios" />

          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                    Servicios
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                    Constructor y creador de servicios
                  </h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Definí cómo se reservan y cobran tus servicios.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
              {saveMessage ? (
                <p className={`mt-3 text-sm font-medium ${saveError ? 'text-red-500' : 'text-[#1FB6A6]'}`}>
                  {saveMessage}
                </p>
              ) : null}
            </div>

            {showSkeleton ? (
              <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <div className="h-5 w-52 rounded-full bg-[#E2E7EC]" />
                <div className="mt-4 space-y-3">
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                  <div className="h-10 w-full rounded-[14px] bg-[#F1F5F9]" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-white/70 bg-white/95 px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#94A3B8]">Total</p>
                    <p className="mt-1 text-3xl font-semibold text-[#0E2A47]">{serviceCount}</p>
                    <p className="text-xs text-[#64748B]">servicios cargados</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/95 px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#94A3B8]">Activos</p>
                    <p className="mt-1 text-3xl font-semibold text-[#1FB6A6]">
                      {services.filter((s) => !s.paused).length}
                    </p>
                    <p className="text-xs text-[#64748B]">disponibles para reservar</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/95 px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#94A3B8]">Pausados</p>
                    <p className="mt-1 text-3xl font-semibold text-amber-500">
                      {services.filter((s) => s.paused).length}
                    </p>
                    <p className="text-xs text-[#64748B]">temporalmente desactivados</p>
                  </div>
                </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94A3B8]">
                        Crear servicio
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Completá los datos y publicalo abajo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetDraft}
                      className="rounded-full border border-dashed border-[#CBD5F5] bg-white/80 px-4 py-2 text-sm font-semibold text-[#1FB6A6] transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      + Nuevo servicio
                    </button>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                          {editingId ? 'Editando servicio' : 'Servicio nuevo'}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                          {draft.name || 'Nuevo servicio'}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Nombre del servicio
                        </label>
                        <input
                          className={inputClassName}
                          value={draft.name}
                          onChange={(event) =>
                            handleDraftChange({ name: event.target.value })
                          }
                          placeholder="Ej: Corte + styling"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[#0E2A47]">
                          Precio
                        </label>
                        <input
                          className={inputClassName}
                          value={draft.price}
                          onChange={(event) =>
                            handleDraftChange({ price: event.target.value })
                          }
                          placeholder="Ej: $9.500"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Duración del servicio
                          </label>
                          <input
                            className={inputClassName}
                            value={draft.duration}
                            onChange={(event) =>
                              handleDraftChange({ duration: event.target.value })
                            }
                            placeholder="Ej: 45 min"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[#0E2A47]">
                            Tiempo extra de preparación
                          </label>
                          <input
                            className={inputClassName}
                            value={draft.bufferTime}
                            onChange={(event) =>
                              handleDraftChange({
                                bufferTime: event.target.value,
                              })
                            }
                            placeholder="Ej: 15 min"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-medium text-[#0E2A47]">
                        Forma de pago
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {paymentOptions.map((option) => {
                          const isActive = draft.paymentType === option.value;
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer flex-col gap-2 rounded-[16px] border px-3 py-3 text-sm transition ${
                                isActive
                                  ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                                  : 'border-[#E2E7EC] bg-white text-[#64748B]'
                              }`}
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span>{option.label}</span>
                                <input
                                  type="radio"
                                  name="payment-draft"
                                  value={option.value}
                                  checked={isActive}
                                  onChange={() =>
                                    handleDraftChange({ paymentType: option.value })
                                  }
                                  className="h-4 w-4 accent-[#1FB6A6]"
                                />
                              </div>
                              <span className="text-xs text-[#64748B]">
                                {option.description}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#0E2A47]">
                            Fotos del servicio
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Máximo {maxServicePhotos} fotos. La primera será la
                            imagen de la reserva (próximamente).
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#94A3B8]">
                          {draft.photos.length}/{maxServicePhotos}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {draft.photos.map((photo, photoIndex) => (
                          <div key={photo.id} className="space-y-2">
                            <div
                              className="h-24 rounded-[16px] border border-[#E2E7EC] bg-[#F4F6F8] bg-cover bg-center"
                              style={{
                                backgroundImage: photo.url
                                  ? `url("${photo.url}")`
                                  : undefined,
                              }}
                            />
                            <input
                              className={inputClassName}
                              placeholder="Pegá la URL"
                              value={photo.url}
                              onChange={(event) =>
                                handleDraftPhotoChange(
                                  photoIndex,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addDraftPhoto}
                        disabled={draft.photos.length >= maxServicePhotos}
                        className={`mt-3 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          draft.photos.length >= maxServicePhotos
                            ? 'cursor-not-allowed border-[#E2E7EC] bg-[#F4F6F8] text-[#94A3B8]'
                            : 'border-[#E2E7EC] bg-white text-[#0E2A47] hover:-translate-y-0.5 hover:shadow-sm'
                        }`}
                      >
                        Agregar foto
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[#94A3B8]">
                        {editingId
                          ? 'Actualizá el servicio y guardalo.'
                          : 'Listo para sumarlo a tu página.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleSubmitService}
                        className="rounded-full bg-[#1FB6A6] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {editingId ? 'Guardar cambios' : 'Crear servicio'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Servicios creados
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Listado de servicios
                    </h2>
                    <div className="mt-4 space-y-3">
                      {services.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                          Todavía no creaste servicios. Cargá el primero arriba.
                        </div>
                      ) : (
                        services.map((service) => (
                          <div
                            key={service.id}
                            className={`rounded-[18px] border px-4 py-3 transition ${
                              service.paused
                                ? 'border-amber-200 bg-amber-50/60'
                                : 'border-[#E2E7EC] bg-[#F7F9FB]'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={`font-semibold ${service.paused ? 'text-[#94A3B8]' : 'text-[#0E2A47]'}`}>
                                    {service.name || 'Servicio sin nombre'}
                                  </p>
                                  {service.paused ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-600">
                                      Pausado
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-[#64748B]">
                                  {normalizeDurationLabel(service.duration) || 'Duración a definir'}
                                  {service.bufferTime
                                    ? ` · +${normalizeDurationLabel(service.bufferTime)} extra`
                                    : ''}
                                </p>
                                <p className="mt-0.5 text-xs text-[#64748B]">
                                  {service.paymentType === 'full'
                                    ? 'Pago completo'
                                    : service.paymentType === 'deposit'
                                      ? 'Solo seña'
                                      : 'Paga en el local'}
                                </p>
                              </div>
                              <span className={`text-sm font-semibold ${service.paused ? 'text-[#94A3B8]' : 'text-[#1FB6A6]'}`}>
                                {service.price || 'Consultar'}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleTogglePause(service.id)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${
                                  service.paused
                                    ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#1FB6A6]'
                                    : 'border-amber-200 bg-amber-50 text-amber-600'
                                }`}
                              >
                                {service.paused ? 'Activar' : 'Pausar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditService(service)}
                                className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteService(service.id)}
                                className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:-translate-y-0.5 hover:shadow-sm"
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

                <div className="space-y-6">
                  <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Galería de servicios
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                      Fotos cargadas
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(servicePhotos.length > 0
                        ? servicePhotos
                        : Array.from({ length: 4 }).map(() => '')
                      ).map((photo, index) => (
                        <div
                          key={`service-photo-${index}`}
                          className="h-24 rounded-[16px] border border-[#E2E7EC] bg-[#EEF2F6] bg-cover bg-center"
                          style={{
                            backgroundImage: photo ? `url("${photo}")` : undefined,
                          }}
                        />
                      ))}
                    </div>
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
