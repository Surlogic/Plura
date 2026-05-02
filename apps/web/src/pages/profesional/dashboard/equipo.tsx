'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  DashboardHero,
  DashboardSectionHeading,
} from '@/components/profesional/dashboard/DashboardUI';
import api from '@/services/api';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';

type WorkerStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

type ProfessionalWorkerResponse = {
  id: string;
  professionalId?: string;
  userId?: string | null;
  email: string;
  displayName: string;
  status: WorkerStatus;
  owner: boolean;
  serviceIds?: string[];
  acceptedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProfessionalServiceItem = {
  id: string;
  name: string;
  active?: boolean;
};

type InviteForm = {
  email: string;
  displayName: string;
  serviceIds: string[];
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
  }
  return fallback;
};

const statusLabel = (status: WorkerStatus, owner: boolean): string => {
  if (owner) return 'Cuenta dueña';
  switch (status) {
    case 'INVITED':
      return 'Invitación pendiente';
    case 'ACTIVE':
      return 'Activo';
    case 'SUSPENDED':
      return 'Suspendido';
    case 'REMOVED':
      return 'Eliminado';
  }
};

const statusBadgeVariant = (status: WorkerStatus, owner: boolean): 'info' | 'warm' | 'neutral' => {
  if (owner) return 'info';
  if (status === 'ACTIVE') return 'info';
  if (status === 'INVITED') return 'warm';
  return 'neutral';
};

export default function ProfesionalTeamPage() {
  const { profile, hasLoaded } = useProfessionalProfile();
  const [workers, setWorkers] = useState<ProfessionalWorkerResponse[]>([]);
  const [services, setServices] = useState<ProfessionalServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    displayName: '',
    serviceIds: [],
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [editingServicesFor, setEditingServicesFor] = useState<string | null>(null);
  const [editingServiceIds, setEditingServiceIds] = useState<string[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [servicesSubmitting, setServicesSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [workersResponse, servicesResponse] = await Promise.all([
        api.get<ProfessionalWorkerResponse[]>('/profesional/team'),
        api.get<ProfessionalServiceItem[]>('/profesional/services'),
      ]);
      setWorkers(Array.isArray(workersResponse.data) ? workersResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No se pudo cargar el equipo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    void loadAll();
  }, [profile?.id, loadAll]);

  const servicesById = useMemo(() => {
    const map = new Map<string, ProfessionalServiceItem>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const handleInviteToggle = (serviceId: string) => {
    setInviteForm((prev) => {
      const exists = prev.serviceIds.includes(serviceId);
      return {
        ...prev,
        serviceIds: exists
          ? prev.serviceIds.filter((id) => id !== serviceId)
          : [...prev.serviceIds, serviceId],
      };
    });
  };

  const handleInviteSubmit = async () => {
    setErrorMessage(null);
    setFeedbackMessage(null);
    if (!inviteForm.email.trim()) {
      setErrorMessage('Ingresá un email para invitar.');
      return;
    }
    try {
      setInviteSubmitting(true);
      await api.post('/profesional/team/invitations', {
        email: inviteForm.email.trim().toLowerCase(),
        displayName: inviteForm.displayName.trim() || undefined,
        serviceIds: inviteForm.serviceIds,
      });
      setFeedbackMessage('Enviamos la invitación.');
      setInviteForm({ email: '', displayName: '', serviceIds: [] });
      setShowInviteForm(false);
      await loadAll();
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No pudimos enviar la invitación.'));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleStatusChange = async (worker: ProfessionalWorkerResponse, nextStatus: WorkerStatus) => {
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      setStatusUpdating(worker.id);
      await api.patch(`/profesional/team/${worker.id}`, { status: nextStatus });
      await loadAll();
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No se pudo actualizar el estado.'));
    } finally {
      setStatusUpdating(null);
    }
  };

  const openServicesEditor = (worker: ProfessionalWorkerResponse) => {
    setEditingServicesFor(worker.id);
    setEditingServiceIds(worker.serviceIds ?? []);
  };

  const toggleEditingService = (serviceId: string) => {
    setEditingServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const saveServicesEditor = async () => {
    if (!editingServicesFor) return;
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      setServicesSubmitting(true);
      await api.put(`/profesional/team/${editingServicesFor}/services`, {
        serviceIds: editingServiceIds,
      });
      setFeedbackMessage('Servicios actualizados.');
      setEditingServicesFor(null);
      setEditingServiceIds([]);
      await loadAll();
    } catch (error) {
      setErrorMessage(extractApiMessage(error, 'No se pudieron actualizar los servicios.'));
    } finally {
      setServicesSubmitting(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <ProfesionalSidebar profile={profile} active="Equipo" />
      <main className="lg:pl-[260px]">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <DashboardHero
            eyebrow="Equipo"
            title="Equipo del local"
            description="Invitá a tus trabajadores y asigná servicios y horarios para cada uno."
            icon="equipo"
          />

          <div className="mt-6 flex items-center justify-between">
            <DashboardSectionHeading
              eyebrow="Trabajadores"
              title="Personas con agenda en el local"
              description="Cada trabajador tiene su propia agenda y reservas."
            />
            <Button
              variant="brand"
              onClick={() => setShowInviteForm((prev) => !prev)}
              disabled={loading || !hasLoaded}
            >
              {showInviteForm ? 'Cerrar' : 'Invitar trabajador'}
            </Button>
          </div>

          {feedbackMessage ? (
            <p className="mt-4 rounded-[12px] border border-[#cdeee9] bg-[#f0fffc] px-3 py-2 text-xs text-[#1FB6A6]">
              {feedbackMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-4 rounded-[12px] border border-[color:var(--error-soft)] bg-[color:var(--error-soft)] px-3 py-2 text-xs text-[color:var(--error)]">
              {errorMessage}
            </p>
          ) : null}

          {showInviteForm ? (
            <Card tone="default" padding="lg" className="mt-6 rounded-[28px]">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-[color:var(--ink)]">Nueva invitación</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                      Email
                    </label>
                    <input
                      type="email"
                      className="h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm"
                      value={inviteForm.email}
                      onChange={(event) =>
                        setInviteForm((prev) => ({ ...prev, email: event.target.value.toLowerCase() }))
                      }
                      placeholder="trabajador@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                      Nombre visible (opcional)
                    </label>
                    <input
                      type="text"
                      className="h-11 w-full rounded-[16px] border border-[color:var(--border-soft)] bg-white/92 px-3 text-sm"
                      value={inviteForm.displayName}
                      onChange={(event) =>
                        setInviteForm((prev) => ({ ...prev, displayName: event.target.value }))
                      }
                      placeholder="Cómo aparece en el calendario"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                    Servicios habilitados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {services.length === 0 ? (
                      <p className="text-xs text-[color:var(--ink-muted)]">
                        No hay servicios cargados todavía.
                      </p>
                    ) : (
                      services.map((service) => {
                        const checked = inviteForm.serviceIds.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleInviteToggle(service.id)}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              checked
                                ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
                                : 'border-[color:var(--border-soft)] bg-white/80 text-[color:var(--ink-muted)] hover:border-[color:var(--accent-soft)]'
                            }`}
                          >
                            {service.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteForm({ email: '', displayName: '', serviceIds: [] });
                    }}
                    disabled={inviteSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button variant="brand" onClick={handleInviteSubmit} disabled={inviteSubmitting}>
                    {inviteSubmitting ? 'Enviando…' : 'Enviar invitación'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-3">
            {loading ? (
              <p className="text-sm text-[color:var(--ink-muted)]">Cargando equipo…</p>
            ) : workers.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-muted)]">Todavía no agregaste trabajadores.</p>
            ) : (
              workers.map((worker) => {
                const services = (worker.serviceIds ?? [])
                  .map((id) => servicesById.get(id)?.name ?? id)
                  .filter(Boolean);
                const editing = editingServicesFor === worker.id;
                return (
                  <Card key={worker.id} tone="default" padding="lg" className="rounded-[26px]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-[color:var(--ink)]">
                            {worker.displayName || worker.email}
                          </h4>
                          <Badge variant={statusBadgeVariant(worker.status, worker.owner)}>
                            {statusLabel(worker.status, worker.owner)}
                          </Badge>
                        </div>
                        <p className="text-xs text-[color:var(--ink-muted)]">{worker.email}</p>
                        {services.length > 0 ? (
                          <p className="text-xs text-[color:var(--ink-muted)]">
                            Servicios: {services.join(', ')}
                          </p>
                        ) : !worker.owner ? (
                          <p className="text-xs text-[color:var(--ink-muted)]">Sin servicios asignados.</p>
                        ) : null}
                      </div>
                      {!worker.owner ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openServicesEditor(worker)}
                            disabled={editing}
                          >
                            Editar servicios
                          </Button>
                          {worker.status === 'ACTIVE' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStatusChange(worker, 'SUSPENDED')}
                              disabled={statusUpdating === worker.id}
                            >
                              Suspender
                            </Button>
                          ) : null}
                          {worker.status === 'SUSPENDED' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStatusChange(worker, 'ACTIVE')}
                              disabled={statusUpdating === worker.id}
                            >
                              Reactivar
                            </Button>
                          ) : null}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleStatusChange(worker, 'REMOVED')}
                            disabled={statusUpdating === worker.id}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {editing ? (
                      <div className="mt-4 rounded-[18px] border border-[color:var(--border-soft)] bg-white/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ink-muted)]">
                          Servicios habilitados
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {services.length === 0 && servicesById.size === 0 ? (
                            <p className="text-xs text-[color:var(--ink-muted)]">
                              No hay servicios cargados.
                            </p>
                          ) : (
                            Array.from(servicesById.values()).map((service) => {
                              const checked = editingServiceIds.includes(service.id);
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => toggleEditingService(service.id)}
                                  className={`rounded-full border px-3 py-1 text-xs transition ${
                                    checked
                                      ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
                                      : 'border-[color:var(--border-soft)] bg-white/80 text-[color:var(--ink-muted)] hover:border-[color:var(--accent-soft)]'
                                  }`}
                                >
                                  {service.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingServicesFor(null);
                              setEditingServiceIds([]);
                            }}
                            disabled={servicesSubmitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={saveServicesEditor}
                            disabled={servicesSubmitting}
                          >
                            {servicesSubmitting ? 'Guardando…' : 'Guardar'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
