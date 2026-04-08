import { useEffect, useMemo, useState } from 'react';
import {
  cancelProfessionalBooking,
  createProfessionalReservation,
  getProfessionalBookingActions,
  getProfessionalReservationsByRange,
  listProfessionalServices,
  markProfessionalBookingNoShow,
  rescheduleProfessionalBooking,
  updateProfessionalReservationStatus,
} from '../../../services/professionalBookings';
import type { ProfessionalReservation } from '../../../types/professional';
import { getApiErrorMessage } from '../../../services/errors';
import { getPublicSlots } from '../../../services/publicBookings';
import { hasMinimumPhoneDigits } from '../../../lib/internationalPhone';
import { useProfessionalSession } from '../session/useProfessionalSession';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const today = new Date();
const nextMonth = new Date();
nextMonth.setDate(today.getDate() + 30);

const isClosedReservation = (reservation: ProfessionalReservation) =>
  reservation.status === 'completed' || reservation.status === 'no_show';

const isCancelledReservation = (reservation: ProfessionalReservation) =>
  reservation.status === 'cancelled';

const parseReservationDateTime = (reservation: ProfessionalReservation) => {
  const parsed = new Date(`${reservation.date}T${reservation.time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const useProfessionalAgenda = () => {
  const { profile } = useProfessionalSession();
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

  return {
    profile,
    filter,
    isLoading,
    isSubmittingAction,
    error,
    message,
    selectedReservationId,
    actions,
    isLoadingActions,
    cancelReason,
    showCreateForm,
    serviceOptions,
    isLoadingServiceOptions,
    createForm,
    rescheduleDate,
    rescheduleTime,
    rescheduleSlots,
    isLoadingRescheduleSlots,
    selectedReservation,
    todayReservations,
    upcomingReservations,
    closedReservations,
    cancelledReservations,
    stats,
    setFilter,
    setSelectedReservationId,
    setCancelReason,
    setShowCreateForm,
    setCreateForm,
    setRescheduleDate,
    setRescheduleTime,
    handleAction,
    handleCreateReservation,
  };
};
