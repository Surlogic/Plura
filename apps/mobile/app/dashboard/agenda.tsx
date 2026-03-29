import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  cancelProfessionalBooking,
  createProfessionalReservation,
  getProfessionalBookingActions,
  getProfessionalReservationsByRange,
  listProfessionalServices,
  markProfessionalBookingNoShow,
  rescheduleProfessionalBooking,
  updateProfessionalReservationStatus,
} from '../../src/services/professionalBookings';
import type { ProfessionalReservation } from '../../src/types/professional';
import { getApiErrorMessage } from '../../src/services/errors';
import { getPublicSlots } from '../../src/services/publicBookings';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { canProfessionalConfirmReservation } from '../../../../packages/shared/src/bookings/professionalReservationActions';
import { AppScreen } from '../../src/components/ui/AppScreen';
import InternationalPhoneField from '../../src/components/ui/InternationalPhoneField';
import { MessageCard, ScreenHero, StatusPill } from '../../src/components/ui/MobileSurface';
import { hasMinimumPhoneDigits } from '../../src/lib/internationalPhone';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const today = new Date();
const nextMonth = new Date();
nextMonth.setDate(today.getDate() + 30);

const formatReservationStatusLabel = (status?: string) => {
  if (status === 'confirmed') return 'Confirmada';
  if (status === 'completed') return 'Completada';
  if (status === 'cancelled') return 'Cancelada';
  if (status === 'no_show') return 'No asistio';
  return 'Pendiente';
};

const reservationStatusTone = (status?: string) => {
  if (status === 'confirmed') return 'bg-primary/10 text-primary';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'cancelled') return 'bg-red-100 text-red-600';
  if (status === 'no_show') return 'bg-amber-100 text-amber-700';
  return 'bg-amber-100 text-amber-700';
};

const financialStatusLabel = (financialStatus?: string | null) => {
  if (financialStatus === 'PAYMENT_PENDING') return 'Pago pendiente';
  if (financialStatus === 'HELD') return 'Cobro retenido';
  if (financialStatus === 'RELEASED') return 'Cobro liberado';
  if (financialStatus === 'REFUNDED') return 'Reembolsado';
  if (financialStatus === 'FAILED') return 'Cobro fallido';
  if (financialStatus === 'NOT_REQUIRED') return 'Sin cobro online';
  return 'Estado financiero';
};

const financialStatusTone = (financialStatus?: string | null) => {
  if (financialStatus === 'PAYMENT_PENDING') return 'bg-amber-100 text-amber-700';
  if (financialStatus === 'HELD') return 'bg-sky-100 text-sky-700';
  if (financialStatus === 'RELEASED') return 'bg-emerald-100 text-emerald-700';
  if (financialStatus === 'REFUNDED') return 'bg-slate-200 text-slate-700';
  if (financialStatus === 'FAILED') return 'bg-red-100 text-red-600';
  return 'bg-secondary/10 text-secondary';
};

const formatDateLabel = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const isClosedReservation = (reservation: ProfessionalReservation) =>
  reservation.status === 'completed' || reservation.status === 'no_show';

const isCancelledReservation = (reservation: ProfessionalReservation) =>
  reservation.status === 'cancelled';

const parseReservationDateTime = (reservation: ProfessionalReservation) => {
  const parsed = new Date(`${reservation.date}T${reservation.time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function AgendaScreen() {
  const { profile } = useAuthSession();
  const [filter, setFilter] = useState<'hoy' | 'proximas'>('hoy');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [actions, setActions] = useState<Awaited<ReturnType<typeof getProfessionalBookingActions>> | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingServiceOptions, setIsLoadingServiceOptions] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    date: toIsoDate(today),
    time: '09:00',
  });
  const [rescheduleDate, setRescheduleDate] = useState(toIsoDate(today));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);

  const loadReservations = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const dateFrom = filter === 'hoy' ? toIsoDate(today) : toIsoDate(new Date());
      const dateTo = filter === 'hoy' ? toIsoDate(today) : toIsoDate(nextMonth);
      const response = await getProfessionalReservationsByRange(dateFrom, dateTo);
      setReservations(response);
      setSelectedReservationId((current) => {
        if (current && response.some((item) => item.id === current)) return current;
        return response[0]?.id ?? null;
      });
    } catch {
      setError('No pudimos cargar la agenda en este momento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [filter]);

  const sortedReservations = useMemo(
    () => [...reservations].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [reservations],
  );

  const selectedReservation = useMemo(
    () => sortedReservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [selectedReservationId, sortedReservations],
  );

  const todayKey = toIsoDate(new Date());
  const now = new Date();

  const todayReservations = useMemo(
    () => sortedReservations.filter((reservation) => reservation.date === todayKey && !isClosedReservation(reservation) && !isCancelledReservation(reservation)),
    [sortedReservations, todayKey],
  );

  const upcomingReservations = useMemo(
    () => sortedReservations.filter((reservation) => reservation.date > todayKey && !isClosedReservation(reservation) && !isCancelledReservation(reservation)),
    [sortedReservations, todayKey],
  );

  const closedReservations = useMemo(
    () => sortedReservations.filter((reservation) => isClosedReservation(reservation)),
    [sortedReservations],
  );

  const cancelledReservations = useMemo(
    () => sortedReservations.filter((reservation) => isCancelledReservation(reservation)),
    [sortedReservations],
  );

  const todayPendingCount = useMemo(
    () => todayReservations.filter((reservation) => (reservation.status ?? 'pending') === 'pending').length,
    [todayReservations],
  );

  const nextReservation = useMemo(() => {
    const candidates = sortedReservations.filter((reservation) => {
      if (isClosedReservation(reservation) || isCancelledReservation(reservation)) return false;
      const parsed = parseReservationDateTime(reservation);
      return Boolean(parsed && parsed.getTime() >= now.getTime());
    });
    return candidates[0] ?? null;
  }, [sortedReservations, now]);

  const futureAgendaDays = useMemo(
    () => new Set(upcomingReservations.map((reservation) => reservation.date)).size,
    [upcomingReservations],
  );

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedReservation?.id) {
        setActions(null);
        return;
      }

      setIsLoadingActions(true);
      try {
        setActions(await getProfessionalBookingActions(selectedReservation.id));
      } catch {
        setActions(null);
      } finally {
        setIsLoadingActions(false);
      }
    };

    void loadActions();
  }, [selectedReservation?.id]);

  useEffect(() => {
    const loadServices = async () => {
      setIsLoadingServiceOptions(true);
      try {
        const services = await listProfessionalServices();
        const mapped = services.map((service) => ({ id: service.id, name: service.name }));
        setServiceOptions(mapped);
        setCreateForm((prev) => ({
          ...prev,
          serviceId: prev.serviceId || mapped[0]?.id || '',
        }));
      } catch {
        setServiceOptions([]);
      } finally {
        setIsLoadingServiceOptions(false);
      }
    };

    void loadServices();
  }, []);

  useEffect(() => {
    const loadRescheduleSlots = async () => {
      if (!actions?.canReschedule || !selectedReservation?.serviceId || !profile?.slug || !rescheduleDate) {
        setRescheduleSlots([]);
        setRescheduleTime('');
        return;
      }

      setIsLoadingRescheduleSlots(true);
      try {
        const slots = await getPublicSlots(profile.slug, rescheduleDate, selectedReservation.serviceId);
        setRescheduleSlots(slots);
        setRescheduleTime((current) => (current && slots.includes(current) ? current : ''));
      } catch {
        setRescheduleSlots([]);
      } finally {
        setIsLoadingRescheduleSlots(false);
      }
    };

    void loadRescheduleSlots();
  }, [actions?.canReschedule, profile?.slug, rescheduleDate, selectedReservation?.serviceId]);

  const handleAction = async (
    type: 'cancel' | 'confirm' | 'no_show' | 'reschedule',
  ) => {
    if (!selectedReservation) return;

    setIsSubmittingAction(true);
    setMessage(null);
    try {
      if (type === 'cancel') {
        await cancelProfessionalBooking(selectedReservation.id, cancelReason);
      } else if (type === 'confirm') {
        await updateProfessionalReservationStatus(selectedReservation.id, 'confirmed');
      } else if (type === 'no_show') {
        await markProfessionalBookingNoShow(selectedReservation.id);
      } else if (type === 'reschedule') {
        if (!rescheduleDate || !rescheduleTime) {
          setMessage('Selecciona una fecha y un horario para reagendar.');
          return;
        }
        await rescheduleProfessionalBooking(selectedReservation.id, `${rescheduleDate}T${rescheduleTime}:00`);
      }

      setMessage('Accion aplicada correctamente.');
      await loadReservations();
    } catch (actionError) {
      setMessage(getApiErrorMessage(actionError, 'No se pudo aplicar la accion.'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateReservation = async () => {
    if (!createForm.clientName.trim() || !createForm.serviceId || !createForm.date || !createForm.time) {
      setMessage('Completa cliente, servicio, fecha y hora para crear la reserva.');
      return;
    }
    if (createForm.clientPhone.trim() && !hasMinimumPhoneDigits(createForm.clientPhone)) {
      setMessage('Si cargas telefono del cliente, ingresa un numero valido.');
      return;
    }

    setIsSubmittingAction(true);
    setMessage(null);
    try {
      await createProfessionalReservation({
        clientName: createForm.clientName.trim(),
        clientEmail: createForm.clientEmail.trim() || undefined,
        clientPhone: createForm.clientPhone.trim() || undefined,
        serviceId: createForm.serviceId,
        startDateTime: `${createForm.date}T${createForm.time}:00`,
      });

      setCreateForm((prev) => ({
        ...prev,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
      }));
      setShowCreateForm(false);
      setMessage('Reserva creada correctamente.');
      await loadReservations();
    } catch (createError) {
      setMessage(getApiErrorMessage(createError, 'No se pudo crear la reserva.'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const stats = [
    {
      label: 'Hoy',
      value: `${todayReservations.length}`,
      detail: todayReservations.length > 0 ? 'Reservas activas del dia' : 'Sin turnos activos',
      tone: 'bg-amber-50',
      textTone: '#B45309',
      icon: 'today-outline' as const,
    },
    {
      label: 'Pendientes',
      value: `${todayPendingCount}`,
      detail: todayPendingCount > 0 ? 'Por confirmar hoy' : 'Nada urgente por validar',
      tone: 'bg-primary/10',
      textTone: '#0A7A43',
      icon: 'warning-outline' as const,
    },
    {
      label: 'Proxima atencion',
      value: nextReservation?.time || '--:--',
      detail: nextReservation ? `${nextReservation.clientName} · ${nextReservation.serviceName}` : 'Sin reservas futuras',
      tone: 'bg-secondary/10',
      textTone: '#0F172A',
      icon: 'alarm-outline' as const,
    },
    {
      label: 'Dias con agenda',
      value: `${futureAgendaDays}`,
      detail: futureAgendaDays > 0 ? 'Dias con reservas futuras' : 'Sin agenda futura',
      tone: 'bg-emerald-50',
      textTone: '#047857',
      icon: 'sparkles-outline' as const,
    },
  ];

  const renderReservationCard = (reservation: ProfessionalReservation) => {
    const selected = selectedReservationId === reservation.id;
    const financialStatus = reservation.financialSummary?.financialStatus ?? null;

    return (
      <TouchableOpacity
        key={reservation.id}
        onPress={() => setSelectedReservationId(reservation.id)}
        className={`rounded-[22px] border p-5 ${selected ? 'border-primary/30 bg-primary/5' : 'border-secondary/8 bg-background'}`}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-base font-bold text-secondary">{reservation.serviceName}</Text>
            <Text className="mt-1 text-sm text-gray-500">{reservation.clientName}</Text>
          </View>
          <StatusPill
            label={formatReservationStatusLabel(reservation.status)}
            tone={
              reservation.status === 'confirmed'
                ? 'success'
                : reservation.status === 'cancelled'
                  ? 'danger'
                  : reservation.status === 'completed'
                    ? 'neutral'
                    : 'warning'
            }
          />
        </View>

        <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="rounded-full bg-white px-3 py-2">
            <Text className="text-xs font-semibold text-secondary">{formatDateLabel(reservation.date)}</Text>
          </View>
          <View className="rounded-full bg-white px-3 py-2">
            <Text className="text-xs font-semibold text-secondary">{reservation.time}</Text>
          </View>
          <View className="rounded-full bg-white px-3 py-2">
            <Text className="text-xs font-semibold text-secondary">{reservation.duration || '30 min'}</Text>
          </View>
          {reservation.price ? (
            <View className="rounded-full bg-white px-3 py-2">
              <Text className="text-xs font-semibold text-primary">{reservation.price}</Text>
            </View>
          ) : null}
          {financialStatus ? (
            <View className={`rounded-full px-3 py-2 ${financialStatusTone(financialStatus)}`}>
              <Text className="text-xs font-semibold">{financialStatusLabel(financialStatus)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (
    title: string,
    description: string,
    items: ProfessionalReservation[],
    emptyMessage: string,
  ) => (
    <View className="mt-6 rounded-[28px] border border-secondary/8 bg-white p-5 shadow-sm">
      <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">{title}</Text>
      <Text className="mt-2 text-base leading-6 text-gray-500">{description}</Text>
      <View className="mt-4" style={{ gap: 12 }}>
        {items.length === 0 ? (
          <View className="rounded-[20px] border border-dashed border-secondary/15 bg-background p-5">
            <Text className="text-sm text-gray-500">{emptyMessage}</Text>
          </View>
        ) : (
          items.map(renderReservationCard)
        )}
      </View>
    </View>
  );
  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          <ScreenHero
            eyebrow="Agenda profesional"
            title="Turnos y reservas"
            description="Prioriza lo urgente, revisa pendientes del dia y gestiona cambios sin salir del panel."
            icon="calendar-outline"
            badges={[
              { label: profile?.rubro || 'Profesional', tone: 'light' },
              { label: filter === 'hoy' ? 'Vista del dia' : 'Proximos 30 dias', tone: 'light' },
            ]}
          />

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <TouchableOpacity onPress={() => setFilter('hoy')} className={`rounded-full px-5 py-3 ${filter === 'hoy' ? 'bg-secondary' : 'border border-secondary/10 bg-white'}`}>
              <Text className={`font-bold ${filter === 'hoy' ? 'text-white' : 'text-secondary'}`}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('proximas')} className={`rounded-full px-5 py-3 ${filter === 'proximas' ? 'bg-secondary' : 'border border-secondary/10 bg-white'}`}>
              <Text className={`font-bold ${filter === 'proximas' ? 'text-white' : 'text-secondary'}`}>Proximas</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 mt-6">
          <View className="flex-row flex-wrap justify-between">
            {stats.map((item) => (
              <View key={item.label} className="mb-4 w-[48%] rounded-[24px] border border-secondary/8 bg-white p-4 shadow-sm">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${item.tone}`}>
                  <Ionicons name={item.icon} size={18} color={item.textTone} />
                </View>
                <Text className="mt-4 text-[11px] font-bold uppercase tracking-[1px] text-gray-500">{item.label}</Text>
                <Text className="mt-1 text-2xl font-bold text-secondary">{item.value}</Text>
                <Text className="mt-2 text-xs leading-5 text-gray-500">{item.detail}</Text>
              </View>
            ))}
          </View>

          {message ? (
            <MessageCard message={message} tone="primary" style={{ marginBottom: 16 }} />
          ) : null}

          {error ? (
            <MessageCard message={error} tone="danger" style={{ marginBottom: 16 }} />
          ) : null}

          <View className="rounded-[28px] border border-secondary/8 bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Nueva reserva</Text>
                <Text className="mt-2 text-base leading-6 text-gray-500">Crea un turno manual para agenda o asistencia directa.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateForm((prev) => !prev)} className="rounded-full border border-secondary/10 bg-background px-4 py-2">
                <Text className="text-xs font-bold text-secondary">{showCreateForm ? 'Cerrar' : 'Abrir'}</Text>
              </TouchableOpacity>
            </View>

            {showCreateForm ? (
              <>
                <TextInput className="mt-4 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="Nombre del cliente" value={createForm.clientName} onChangeText={(value) => setCreateForm((prev) => ({ ...prev, clientName: value }))} />
                <TextInput className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="Email cliente (opcional)" value={createForm.clientEmail} onChangeText={(value) => setCreateForm((prev) => ({ ...prev, clientEmail: value }))} />
                <InternationalPhoneField
                  label="Telefono cliente"
                  value={createForm.clientPhone}
                  onChange={(value) => setCreateForm((prev) => ({ ...prev, clientPhone: value }))}
                  placeholder="11 2345 6789"
                  helperText="Opcional. Si lo cargas, se guarda con codigo internacional."
                />
                <View className="mt-3 flex-row" style={{ gap: 10 }}>
                  <TextInput className="h-12 flex-1 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="Fecha YYYY-MM-DD" value={createForm.date} onChangeText={(value) => setCreateForm((prev) => ({ ...prev, date: value }))} />
                  <TextInput className="h-12 w-28 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="HH:mm" value={createForm.time} onChangeText={(value) => setCreateForm((prev) => ({ ...prev, time: value }))} />
                </View>
                <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                  {isLoadingServiceOptions ? (
                    <ActivityIndicator color="#0A7A43" />
                  ) : (
                    serviceOptions.map((service) => (
                      <TouchableOpacity key={service.id} onPress={() => setCreateForm((prev) => ({ ...prev, serviceId: service.id }))} className={`rounded-full px-3 py-2 ${createForm.serviceId === service.id ? 'bg-secondary' : 'border border-secondary/10 bg-background'}`}>
                        <Text className={`text-xs font-semibold ${createForm.serviceId === service.id ? 'text-white' : 'text-secondary'}`}>{service.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                <TouchableOpacity disabled={isSubmittingAction} onPress={() => void handleCreateReservation()} className="mt-4 h-12 items-center justify-center rounded-full bg-secondary">
                  <Text className="font-bold text-white">{isSubmittingAction ? 'Creando...' : 'Crear reserva'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {isLoading ? (
            <View className="py-16 items-center">
              <ActivityIndicator color="#0A7A43" />
            </View>
          ) : (
            <>
              {renderSection('Reservas de hoy', 'Prioridad operativa y financiera para lo inmediato.', todayReservations, 'No tienes reservas activas para hoy.')}

              {filter === 'proximas'
                ? renderSection('Proximas reservas', 'Agenda futura activa con sus estados actuales.', upcomingReservations, 'No hay reservas futuras activas.')
                : null}

              {renderSection('Reservas cerradas', 'Completadas o marcadas como no-show.', closedReservations, 'Todavia no hay reservas cerradas.')}

              {renderSection('Canceladas', 'Seguimiento de cancelaciones ya resueltas.', cancelledReservations, 'No hay reservas canceladas.')}

              <View className="mt-6 rounded-[28px] border border-secondary/8 bg-white p-5 shadow-sm">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Detalle</Text>
                {!selectedReservation ? (
                  <View className="mt-4 rounded-[20px] border border-dashed border-secondary/15 bg-background p-5">
                    <Text className="text-sm text-gray-500">Selecciona una reserva para ver su detalle y acciones.</Text>
                  </View>
                ) : (
                  <>
                    <View className="mt-4 flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-xl font-bold text-secondary">{selectedReservation.serviceName}</Text>
                        <Text className="mt-1 text-sm text-gray-500">{selectedReservation.clientName}</Text>
                      </View>
                      <View className={`rounded-full px-3 py-1 ${reservationStatusTone(selectedReservation.status)}`}>
                        <Text className="text-xs font-bold">{formatReservationStatusLabel(selectedReservation.status)}</Text>
                      </View>
                    </View>

                    <View className="mt-5 rounded-[22px] bg-background p-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-500">Fecha</Text>
                        <Text className="text-sm font-semibold text-secondary">{formatDateLabel(selectedReservation.date)}</Text>
                      </View>
                      <View className="mt-3 flex-row items-center justify-between">
                        <Text className="text-sm text-gray-500">Hora</Text>
                        <Text className="text-sm font-semibold text-secondary">{selectedReservation.time}</Text>
                      </View>
                      <View className="mt-3 flex-row items-center justify-between">
                        <Text className="text-sm text-gray-500">Duracion</Text>
                        <Text className="text-sm font-semibold text-secondary">{selectedReservation.duration || '30 min'}</Text>
                      </View>
                      {selectedReservation.price ? (
                        <View className="mt-3 flex-row items-center justify-between">
                          <Text className="text-sm text-gray-500">Importe</Text>
                          <Text className="text-sm font-semibold text-primary">{selectedReservation.price}</Text>
                        </View>
                      ) : null}
                      {selectedReservation.paymentType ? (
                        <View className="mt-3 flex-row items-center justify-between">
                          <Text className="text-sm text-gray-500">Pago</Text>
                          <Text className="text-sm font-semibold text-secondary">{selectedReservation.paymentType}</Text>
                        </View>
                      ) : null}
                      {selectedReservation.financialSummary?.financialStatus ? (
                        <View className="mt-3 flex-row items-center justify-between">
                          <Text className="text-sm text-gray-500">Estado financiero</Text>
                          <View className={`rounded-full px-3 py-1 ${financialStatusTone(selectedReservation.financialSummary.financialStatus)}`}>
                            <Text className="text-xs font-semibold">{financialStatusLabel(selectedReservation.financialSummary.financialStatus)}</Text>
                          </View>
                        </View>
                      ) : null}
                      {selectedReservation.notes ? (
                        <View className="mt-3">
                          <Text className="text-sm text-gray-500">Notas</Text>
                          <Text className="mt-1 text-sm leading-6 text-secondary">{selectedReservation.notes}</Text>
                        </View>
                      ) : null}
                    </View>

                    {isLoadingActions ? (
                      <View className="mt-5 items-center">
                        <ActivityIndicator color="#0A7A43" />
                      </View>
                    ) : null}

                    {actions?.canCancel ? (
                      <>
                        <TextInput className="mt-5 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="Motivo de cancelacion (opcional)" value={cancelReason} onChangeText={setCancelReason} />
                        <TouchableOpacity
                          disabled={isSubmittingAction}
                          onPress={() => {
                            Alert.alert('Cancelar reserva', 'Se cancelara la reserva seleccionada.', [
                              { text: 'No', style: 'cancel' },
                              { text: 'Si, cancelar', style: 'destructive', onPress: () => { void handleAction('cancel'); } },
                            ]);
                          }}
                          className="mt-3 h-12 items-center justify-center rounded-full bg-red-600"
                        >
                          <Text className="font-bold text-white">Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {actions?.canMarkNoShow ? (
                      <TouchableOpacity disabled={isSubmittingAction} onPress={() => void handleAction('no_show')} className="mt-3 h-12 items-center justify-center rounded-full bg-amber-600">
                        <Text className="font-bold text-white">Marcar no-show</Text>
                      </TouchableOpacity>
                    ) : null}

                    {actions?.canReschedule ? (
                      <>
                        <TextInput className="mt-3 h-12 rounded-2xl border border-secondary/10 bg-background px-4 text-secondary" placeholder="Nueva fecha YYYY-MM-DD" value={rescheduleDate} onChangeText={setRescheduleDate} />
                        {isLoadingRescheduleSlots ? (
                          <View className="mt-3 items-center">
                            <ActivityIndicator color="#0A7A43" />
                          </View>
                        ) : (
                          <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                            {rescheduleSlots.map((slot) => (
                              <TouchableOpacity key={slot} onPress={() => setRescheduleTime(slot)} className={`rounded-full px-3 py-2 ${rescheduleTime === slot ? 'bg-secondary' : 'border border-secondary/10 bg-background'}`}>
                                <Text className={`text-xs font-semibold ${rescheduleTime === slot ? 'text-white' : 'text-secondary'}`}>{slot}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <TouchableOpacity disabled={isSubmittingAction || !rescheduleTime} onPress={() => void handleAction('reschedule')} className={`mt-3 h-12 items-center justify-center rounded-full ${rescheduleTime ? 'bg-secondary' : 'bg-gray-300'}`}>
                          <Text className="font-bold text-white">Reagendar</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {canProfessionalConfirmReservation(selectedReservation.status) ? (
                      <TouchableOpacity disabled={isSubmittingAction} onPress={() => void handleAction('confirm')} className="mt-3 h-12 items-center justify-center rounded-full bg-secondary">
                        <Text className="font-bold text-white">Confirmar reserva</Text>
                      </TouchableOpacity>
                    ) : null}

                  </>
                )}
              </View>
            </>
          )}
        </View>
    </AppScreen>
  );
}
