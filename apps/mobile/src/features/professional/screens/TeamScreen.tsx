import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { isAxiosError } from 'axios';
import { AppScreen } from '../../../components/ui/AppScreen';
import {
  ActionButton,
  MessageCard,
  ScreenHero,
  SectionCard,
  SelectionChip,
  StatusPill,
} from '../../../components/ui/MobileSurface';
import { theme } from '../../../theme';
import {
  fetchProfessionalServices,
  fetchTeam,
  inviteWorker,
  updateWorker,
  updateWorkerServices,
  type ProfessionalServiceSummary,
  type ProfessionalWorker,
  type WorkerStatus,
} from '../../../services/professionalTeam';
import { getApiErrorMessage } from '../../../services/errors';

const extractMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
  }
  return getApiErrorMessage(error, fallback);
};

const statusLabel = (status: WorkerStatus, owner: boolean) => {
  if (owner) return 'Cuenta dueña';
  switch (status) {
    case 'INVITED':
      return 'Invitación pendiente';
    case 'ACTIVE':
      return 'Activo';
    case 'SUSPENDED':
      return 'Suspendido';
    default:
      return 'Eliminado';
  }
};

const statusTone = (status: WorkerStatus, owner: boolean) => {
  if (owner) return 'primary' as const;
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'INVITED') return 'warning' as const;
  if (status === 'SUSPENDED') return 'danger' as const;
  return 'neutral' as const;
};

export default function TeamScreen() {
  const [workers, setWorkers] = useState<ProfessionalWorker[]>([]);
  const [services, setServices] = useState<ProfessionalServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    displayName: '',
    serviceIds: [] as string[],
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingServiceIds, setEditingServiceIds] = useState<string[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [servicesUpdating, setServicesUpdating] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [workersResponse, servicesResponse] = await Promise.all([
        fetchTeam(),
        fetchProfessionalServices(),
      ]);
      setWorkers(workersResponse);
      setServices(servicesResponse);
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No pudimos cargar el equipo.'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initial = async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    };
    void initial();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const servicesById = useMemo(() => {
    const map = new Map<string, ProfessionalServiceSummary>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const toggleInviteService = (serviceId: string) => {
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

  const submitInvite = async () => {
    setErrorMessage(null);
    setFeedbackMessage(null);
    if (!inviteForm.email.trim()) {
      setErrorMessage('Ingresá un email para invitar.');
      return;
    }
    try {
      setInviteSubmitting(true);
      await inviteWorker({
        email: inviteForm.email.trim().toLowerCase(),
        displayName: inviteForm.displayName.trim() || undefined,
        serviceIds: inviteForm.serviceIds,
      });
      setFeedbackMessage('Enviamos la invitación.');
      setInviteForm({ email: '', displayName: '', serviceIds: [] });
      setShowInviteForm(false);
      await load();
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No pudimos enviar la invitación.'));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleStatusChange = async (worker: ProfessionalWorker, nextStatus: WorkerStatus) => {
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      setStatusUpdatingId(worker.id);
      await updateWorker(worker.id, { status: nextStatus });
      await load();
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No se pudo actualizar el estado.'));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const startEditingServices = (worker: ProfessionalWorker) => {
    setEditingWorkerId(worker.id);
    setEditingServiceIds(worker.serviceIds ?? []);
  };

  const toggleEditingService = (serviceId: string) => {
    setEditingServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const saveServices = async () => {
    if (!editingWorkerId) return;
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      setServicesUpdating(true);
      await updateWorkerServices(editingWorkerId, editingServiceIds);
      setFeedbackMessage('Servicios actualizados.');
      setEditingWorkerId(null);
      setEditingServiceIds([]);
      await load();
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No se pudieron actualizar los servicios.'));
    } finally {
      setServicesUpdating(false);
    }
  };

  return (
    <AppScreen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View className="px-4 pt-4">
        <ScreenHero
          eyebrow="Equipo"
          title="Equipo del local"
          description="Invitá trabajadores y configurá los servicios que pueden hacer."
          icon="people"
          primaryAction={{
            label: showInviteForm ? 'Cerrar formulario' : 'Invitar trabajador',
            onPress: () => setShowInviteForm((prev) => !prev),
            tone: 'brand',
          }}
        />

        {feedbackMessage ? (
          <MessageCard message={feedbackMessage} tone="success" style={{ marginTop: 12 }} />
        ) : null}
        {errorMessage ? (
          <MessageCard message={errorMessage} tone="danger" style={{ marginTop: 12 }} />
        ) : null}

        {showInviteForm ? (
          <SectionCard style={{ marginTop: 16 }}>
            <Text className="text-base font-semibold text-secondary">Nueva invitación</Text>
            <View className="mt-3">
              <Text className="text-xs font-bold uppercase tracking-[1.2px] text-faint">
                Email
              </Text>
              <TextInput
                className="mt-2 h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                value={inviteForm.email}
                onChangeText={(value) =>
                  setInviteForm((prev) => ({ ...prev, email: value.toLowerCase() }))
                }
                placeholder="trabajador@ejemplo.com"
                placeholderTextColor={theme.colors.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View className="mt-3">
              <Text className="text-xs font-bold uppercase tracking-[1.2px] text-faint">
                Nombre visible
              </Text>
              <TextInput
                className="mt-2 h-12 rounded-2xl border border-secondary/10 bg-backgroundSoft px-4 text-sm text-secondary"
                value={inviteForm.displayName}
                onChangeText={(value) =>
                  setInviteForm((prev) => ({ ...prev, displayName: value }))
                }
                placeholder="Como aparece en el calendario"
                placeholderTextColor={theme.colors.inkFaint}
              />
            </View>
            <View className="mt-3">
              <Text className="text-xs font-bold uppercase tracking-[1.2px] text-faint">
                Servicios habilitados
              </Text>
              <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                {services.length === 0 ? (
                  <Text className="text-xs text-muted">No hay servicios cargados todavía.</Text>
                ) : (
                  services.map((service) => (
                    <SelectionChip
                      key={service.id}
                      label={service.name}
                      selected={inviteForm.serviceIds.includes(service.id)}
                      onPress={() => toggleInviteService(service.id)}
                    />
                  ))
                )}
              </View>
            </View>
            <View className="mt-4 flex-row justify-end" style={{ gap: 10 }}>
              <ActionButton
                label="Cancelar"
                tone="secondary"
                onPress={() => {
                  setShowInviteForm(false);
                  setInviteForm({ email: '', displayName: '', serviceIds: [] });
                }}
                disabled={inviteSubmitting}
              />
              <ActionButton
                label={inviteSubmitting ? 'Enviando…' : 'Enviar'}
                tone="brand"
                onPress={submitInvite}
                disabled={inviteSubmitting}
                loading={inviteSubmitting}
              />
            </View>
          </SectionCard>
        ) : null}

        {loading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {!loading && workers.length === 0 ? (
          <SectionCard soft style={{ marginTop: 16 }}>
            <Text className="text-sm text-muted">Todavía no agregaste trabajadores.</Text>
          </SectionCard>
        ) : null}

        <View className="mt-4" style={{ gap: 12 }}>
          {workers.map((worker) => {
            const services = (worker.serviceIds ?? [])
              .map((id) => servicesById.get(id)?.name ?? id)
              .filter(Boolean);
            const editing = editingWorkerId === worker.id;
            const updatingStatus = statusUpdatingId === worker.id;
            return (
              <SectionCard key={worker.id}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-secondary">
                      {worker.displayName || worker.email}
                    </Text>
                    <Text className="mt-1 text-xs text-muted">{worker.email}</Text>
                  </View>
                  <StatusPill
                    label={statusLabel(worker.status, worker.owner)}
                    tone={statusTone(worker.status, worker.owner)}
                  />
                </View>

                {services.length > 0 ? (
                  <Text className="mt-2 text-xs text-muted">
                    Servicios: {services.join(', ')}
                  </Text>
                ) : !worker.owner ? (
                  <Text className="mt-2 text-xs text-muted">Sin servicios asignados.</Text>
                ) : null}

                {!worker.owner ? (
                  <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                    <ActionButton
                      label="Editar servicios"
                      tone="secondary"
                      onPress={() => startEditingServices(worker)}
                      disabled={editing}
                    />
                    {worker.status === 'ACTIVE' ? (
                      <ActionButton
                        label="Suspender"
                        tone="secondary"
                        onPress={() => handleStatusChange(worker, 'SUSPENDED')}
                        disabled={updatingStatus}
                      />
                    ) : null}
                    {worker.status === 'SUSPENDED' ? (
                      <ActionButton
                        label="Reactivar"
                        tone="secondary"
                        onPress={() => handleStatusChange(worker, 'ACTIVE')}
                        disabled={updatingStatus}
                      />
                    ) : null}
                    <ActionButton
                      label="Eliminar"
                      tone="danger"
                      onPress={() => handleStatusChange(worker, 'REMOVED')}
                      disabled={updatingStatus}
                    />
                  </View>
                ) : null}

                {editing ? (
                  <View className="mt-4 rounded-2xl border border-secondary/10 bg-surface p-4">
                    <Text className="text-xs font-bold uppercase tracking-[1.2px] text-faint">
                      Servicios habilitados
                    </Text>
                    <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                      {services.length === 0 && servicesById.size === 0 ? (
                        <Text className="text-xs text-muted">No hay servicios cargados.</Text>
                      ) : (
                        Array.from(servicesById.values()).map((service) => (
                          <SelectionChip
                            key={service.id}
                            label={service.name}
                            selected={editingServiceIds.includes(service.id)}
                            onPress={() => toggleEditingService(service.id)}
                          />
                        ))
                      )}
                    </View>
                    <View className="mt-4 flex-row justify-end" style={{ gap: 10 }}>
                      <ActionButton
                        label="Cancelar"
                        tone="secondary"
                        onPress={() => {
                          setEditingWorkerId(null);
                          setEditingServiceIds([]);
                        }}
                        disabled={servicesUpdating}
                      />
                      <ActionButton
                        label={servicesUpdating ? 'Guardando…' : 'Guardar'}
                        tone="brand"
                        onPress={saveServices}
                        disabled={servicesUpdating}
                        loading={servicesUpdating}
                      />
                    </View>
                  </View>
                ) : null}
              </SectionCard>
            );
          })}
        </View>
      </View>
    </AppScreen>
  );
}
