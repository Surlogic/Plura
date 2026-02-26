'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import api from '@/services/api';

type ProfesionalServiceItem = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

type ServiceDraft = {
  name: string;
  price: string;
  duration: string;
};

const createEmptyDraft = (): ServiceDraft => ({
  name: '',
  price: '',
  duration: '',
});

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

export default function ProfesionalServicesBuilderPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [services, setServices] = useState<ProfesionalServiceItem[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const inputClassName =
    'h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1FB6A6]/30';

  const loadServices = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingServices(true);
    try {
      const response = await api.get<ProfesionalServiceItem[]>('/profesional/services');
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch {
      setServices([]);
      setSaveMessage('No se pudieron cargar los servicios.');
      setSaveError(true);
    } finally {
      setIsLoadingServices(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void loadServices();
  }, [profile?.id, loadServices]);

  const handleDraftChange = (field: keyof ServiceDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetDraft = () => {
    setDraft(createEmptyDraft());
    setEditingId(null);
  };

  const handleEditService = (service: ProfesionalServiceItem) => {
    setDraft({
      name: service.name,
      price: service.price,
      duration: service.duration,
    });
    setEditingId(service.id);
  };

  const handleDeleteService = async (serviceId: string) => {
    setIsSubmitting(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      await api.delete(`/profesional/services/${serviceId}`);
      setSaveMessage('Servicio eliminado correctamente.');
      setSaveError(false);
      if (editingId === serviceId) {
        resetDraft();
      }
      await loadServices();
    } catch {
      setSaveMessage('No se pudo eliminar el servicio.');
      setSaveError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitService = async () => {
    if (!draft.name.trim() || !draft.price.trim() || !draft.duration.trim()) {
      setSaveMessage('Completá nombre, precio y duración.');
      setSaveError(true);
      return;
    }

    const payload = {
      name: draft.name.trim(),
      price: draft.price.trim(),
      duration: draft.duration.trim(),
    };

    setIsSubmitting(true);
    setSaveMessage(null);
    setSaveError(false);

    try {
      if (editingId) {
        await api.put(`/profesional/services/${editingId}`, payload);
        setSaveMessage('Servicio actualizado correctamente.');
      } else {
        await api.post('/profesional/services', payload);
        setSaveMessage('Servicio creado correctamente.');
      }
      setSaveError(false);
      resetDraft();
      await loadServices();
    } catch {
      setSaveMessage('No se pudo guardar el servicio.');
      setSaveError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const serviceCount = useMemo(() => services.length, [services]);

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
              <ProfesionalSidebar profile={profile} active="Servicios" />
            </div>
          </aside>
          <div className="flex-1">
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Servicios" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                        Servicios
                      </p>
                      <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                        Servicios del profesional
                      </h1>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Alta, edición y baja con persistencia real en backend.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadServices()}
                      className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isLoadingServices}
                    >
                      {isLoadingServices ? 'Actualizando...' : 'Actualizar lista'}
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
                    <div className="rounded-[22px] border border-white/70 bg-white/95 px-5 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#94A3B8]">Total</p>
                      <p className="mt-1 text-3xl font-semibold text-[#0E2A47]">{serviceCount}</p>
                      <p className="text-xs text-[#64748B]">servicios en base de datos</p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
                      <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                          {editingId ? 'Editando servicio' : 'Nuevo servicio'}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                          {editingId ? 'Actualizar servicio' : 'Crear servicio'}
                        </h2>

                        <div className="mt-4 grid gap-4">
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Nombre del servicio
                            </label>
                            <input
                              className={inputClassName}
                              value={draft.name}
                              onChange={(event) =>
                                handleDraftChange('name', event.target.value)
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
                                handleDraftChange('price', event.target.value)
                              }
                              placeholder="Ej: $9.500"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Duración
                            </label>
                            <input
                              className={inputClassName}
                              value={draft.duration}
                              onChange={(event) =>
                                handleDraftChange('duration', event.target.value)
                              }
                              placeholder="Ej: 45 min"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={resetDraft}
                            className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          >
                            Limpiar formulario
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitService()}
                            className="rounded-full bg-[#1FB6A6] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={isSubmitting}
                          >
                            {isSubmitting
                              ? 'Guardando...'
                              : editingId
                                ? 'Guardar cambios'
                                : 'Crear servicio'}
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
                          {isLoadingServices ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              Cargando servicios...
                            </div>
                          ) : services.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              Todavía no creaste servicios.
                            </div>
                          ) : (
                            services.map((service) => (
                              <div
                                key={service.id}
                                className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[#0E2A47]">
                                      {service.name || 'Servicio sin nombre'}
                                    </p>
                                    <p className="text-xs text-[#64748B]">
                                      {normalizeDurationLabel(service.duration) ||
                                        'Duración a definir'}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold text-[#1FB6A6]">
                                    {service.price || 'Consultar'}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditService(service)}
                                    className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteService(service.id)}
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
