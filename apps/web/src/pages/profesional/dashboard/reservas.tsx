'use client';

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import ProfessionalBookingTimeline from '@/components/profesional/reservations/ProfessionalBookingTimeline';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InternationalPhoneField from '@/components/ui/InternationalPhoneField';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import {
  cancelProfessionalBooking,
  createProfessionalReservation,
  getProfessionalBookingActions,
  getProfessionalReservationsForDates,
  listProfessionalServices,
  markProfessionalBookingNoShow,
  prefetchProfessionalBookingDetail,
  rescheduleProfessionalBooking,
  updateProfessionalReservationStatus,
} from '@/services/professionalBookings';
import { getPublicSlots } from '@/services/publicBookings';
import type { ProfessionalReservation, ReservationStatus } from '@/types/professional';
import {
  describeBookingPolicy,
  formatBookingDateLabel,
  formatBookingMoney,
  formatBookingTimeLabel,
  getOperationalStatusLabel,
  getOperationalStatusTone,
  getPaymentTypeLabel,
  getPayoutStatusCopy as getBookingPayoutStatusCopy,
  getRefundStatusCopy,
  getProfessionalFinancialStatusCopy,
  shouldAutoRefreshFinancialStatus,
} from '@/utils/bookings';
import { canProfessionalConfirmReservation } from '../../../../../../packages/shared/src/bookings/professionalReservationActions';

type DashboardServiceOption = {
  id: string;
  name: string;
};

type ReservationCreateForm = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  date: string;
  time: string;
};

const ACTIVE_STATUSES: ReservationStatus[] = ['pending', 'confirmed'];

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeKey = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toDefaultFutureDateTime = () => {
  const target = new Date();
  target.setMinutes(target.getMinutes() + 30);
  target.setSeconds(0, 0);
  return {
    date: toLocalDateKey(target),
    time: toTimeKey(target),
  };
};

const parseReservationDate = (reservation: ProfessionalReservation) => {
  const dateTime = new Date(reservation.startDateTimeUtc || `${reservation.date}T${reservation.time || '00:00'}`);
  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }
  return dateTime;
};

const sortByDateTimeAsc = (a: ProfessionalReservation, b: ProfessionalReservation) =>
  (parseReservationDate(a)?.getTime() ?? 0) - (parseReservationDate(b)?.getTime() ?? 0);

const sortByDateTimeDesc = (a: ProfessionalReservation, b: ProfessionalReservation) =>
  (parseReservationDate(b)?.getTime() ?? 0) - (parseReservationDate(a)?.getTime() ?? 0);

const buildDateWindow = (daysPast: number, daysFuture: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let offset = -daysPast; offset <= daysFuture; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    dates.push(toLocalDateKey(date));
  }

  return dates;
};

const getFinancialRefreshDelayMs = (attempt: number) => Math.min(60000, 15000 * (attempt + 1));

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const getReservationDisplayDate = (reservation: ProfessionalReservation) =>
  formatBookingDateLabel(
    `${reservation.date}T${reservation.time || '00:00'}`,
    reservation.timezone,
    reservation.startDateTimeUtc,
  ) || reservation.date;

const getReservationDisplayTime = (reservation: ProfessionalReservation) =>
  formatBookingTimeLabel(
    `${reservation.date}T${reservation.time || '00:00'}`,
    reservation.timezone,
    reservation.startDateTimeUtc,
  ) || reservation.time;

const operationalStatusLabel: Record<ReservationStatus, string> = {
  pending: getOperationalStatusLabel('PENDING'),
  confirmed: getOperationalStatusLabel('CONFIRMED'),
  cancelled: getOperationalStatusLabel('CANCELLED'),
  completed: getOperationalStatusLabel('COMPLETED'),
  no_show: getOperationalStatusLabel('NO_SHOW'),
};

const operationalStatusTone: Record<ReservationStatus, string> = {
  pending: getOperationalStatusTone('PENDING'),
  confirmed: getOperationalStatusTone('CONFIRMED'),
  cancelled: getOperationalStatusTone('CANCELLED'),
  completed: getOperationalStatusTone('COMPLETED'),
  no_show: getOperationalStatusTone('NO_SHOW'),
};

export default function ProfesionalReservationsPage() {
  const router = useRouter();
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [actions, setActions] = useState<Awaited<ReturnType<typeof getProfessionalBookingActions>> | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [serviceOptions, setServiceOptions] = useState<DashboardServiceOption[]>([]);
  const [isLoadingServiceOptions, setIsLoadingServiceOptions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const defaultFutureDateTime = useMemo(() => toDefaultFutureDateTime(), []);
  const [createForm, setCreateForm] = useState<ReservationCreateForm>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    date: defaultFutureDateTime.date,
    time: defaultFutureDateTime.time,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);

  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(toLocalDateKey(new Date()));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [timelineRefreshToken, setTimelineRefreshToken] = useState(0);

  const reservationDates = useMemo(() => buildDateWindow(30, 90), []);
  const queryBookingId = useMemo(() => {
    const value = router.query.bookingId;
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }, [router.query.bookingId]);

  const loadReservations = useCallback(async (keepSelection = true) => {
    try {
      if (!keepSelection) setIsLoadingReservations(true);
      setFetchError(null);
      const response = await getProfessionalReservationsForDates(reservationDates);
      setReservations(response);
      let nextSelectedReservationId: string | null = null;
      setSelectedReservationId((current) => {
        if (queryBookingId && response.some((reservation) => reservation.id === queryBookingId)) {
          nextSelectedReservationId = queryBookingId;
          return queryBookingId;
        }
        if (keepSelection && current && response.some((reservation) => reservation.id === current)) {
          nextSelectedReservationId = current;
          return current;
        }
        nextSelectedReservationId = response[0]?.id ?? null;
        return nextSelectedReservationId;
      });
      if (nextSelectedReservationId) {
        void prefetchProfessionalBookingDetail(nextSelectedReservationId);
      }
    } catch (error) {
      setReservations([]);
      setFetchError(extractApiMessage(error, 'No se pudieron cargar las reservas.'));
    } finally {
      setIsLoadingReservations(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationDates, queryBookingId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingServiceOptions(true);

    void Promise.allSettled([
      loadReservations(false),
      listProfessionalServices()
        .then((response) => {
          if (cancelled) return;
          const mapped = response.map((service) => ({
            id: service.id,
            name: service.name,
          }));
          setServiceOptions(mapped);
          setCreateForm((prev) => ({
            ...prev,
            serviceId: prev.serviceId || mapped[0]?.id || '',
          }));
        })
        .catch(() => {
          if (!cancelled) setServiceOptions([]);
        }),
    ]).finally(() => {
      if (!cancelled) {
        setIsLoadingServiceOptions(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [queryBookingId, reservationDates]);

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId],
  );

  useEffect(() => {
    if (!selectedReservation?.id) {
      setActions(null);
      setActionError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingActions(true);
    setActionError(null);

    getProfessionalBookingActions(selectedReservation.id)
      .then((response) => {
        if (!cancelled) setActions(response);
      })
      .catch((error) => {
        if (!cancelled) {
          setActions(null);
          setActionError(
            extractApiMessage(error, 'No pudimos cargar las acciones de esta reserva.'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingActions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedReservation?.id]);

  useEffect(() => {
    if (!selectedReservation?.serviceId || !profile?.slug || !showRescheduleForm || !rescheduleDate) {
      setSlotOptions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSlots(true);

    getPublicSlots(profile.slug, rescheduleDate, selectedReservation.serviceId)
      .then((response) => {
        if (!cancelled) {
          setSlotOptions(response);
          setRescheduleTime((current) => (current && response.includes(current) ? current : ''));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.slug, rescheduleDate, selectedReservation?.serviceId, showRescheduleForm]);

  useEffect(() => {
    if (!selectedReservation?.financialSummary?.financialStatus) return;
    if (!shouldAutoRefreshFinancialStatus(selectedReservation.financialSummary.financialStatus)) return;

    let timeoutId: number | null = null;
    let attempt = 0;

    const clearScheduledRefresh = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleRefresh = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      if (timeoutId !== null) {
        return;
      }

      timeoutId = window.setTimeout(async () => {
        timeoutId = null;
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        await loadReservations();
        attempt += 1;
        scheduleRefresh();
      }, getFinancialRefreshDelayMs(attempt));
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        clearScheduledRefresh();
        return;
      }
      scheduleRefresh();
    };

    scheduleRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearScheduledRefresh();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedReservation?.financialSummary?.financialStatus]);

  const { todayKey, now } = useMemo(() => {
    const n = new Date();
    return { todayKey: toLocalDateKey(n), now: n };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    todayReservations,
    upcomingReservations,
    closedReservations,
    cancelledReservations,
  } = useMemo(() => {
    const today: ProfessionalReservation[] = [];
    const upcoming: ProfessionalReservation[] = [];
    const closed: ProfessionalReservation[] = [];
    const cancelled: ProfessionalReservation[] = [];

    reservations.forEach((reservation) => {
      const reservationDate = parseReservationDate(reservation);
      if (!reservationDate) return;

      if (reservation.status === 'cancelled') {
        cancelled.push(reservation);
        return;
      }

      if (reservation.status === 'completed' || reservation.status === 'no_show') {
        closed.push(reservation);
        return;
      }

      if (reservation.date === todayKey && ACTIVE_STATUSES.includes(reservation.status ?? 'pending')) {
        today.push(reservation);
        return;
      }

      if (reservationDate > now && ACTIVE_STATUSES.includes(reservation.status ?? 'pending')) {
        upcoming.push(reservation);
        return;
      }

      closed.push(reservation);
    });

    return {
      todayReservations: today.sort(sortByDateTimeAsc),
      upcomingReservations: upcoming.sort(sortByDateTimeAsc),
      closedReservations: closed.sort(sortByDateTimeDesc),
      cancelledReservations: cancelled.sort(sortByDateTimeDesc),
    };
  }, [now, reservations, todayKey]);

  const showSkeleton =
    !hasLoaded ||
    (isLoading && !profile) ||
    (isLoadingReservations && reservations.length === 0);

  const selectedFinancialCopy = getProfessionalFinancialStatusCopy(
    selectedReservation?.paymentType,
    selectedReservation?.financialSummary,
  );
  const selectedReservationDateLabel = selectedReservation
    ? getReservationDisplayDate(selectedReservation)
    : '';
  const selectedReservationTimeLabel = selectedReservation
    ? getReservationDisplayTime(selectedReservation)
    : '';
  const canConfirm = canProfessionalConfirmReservation(selectedReservation?.status);
  const handleSelectReservation = (reservationId: string) => {
    void prefetchProfessionalBookingDetail(reservationId);
    setSelectedReservationId(reservationId);
    setShowRescheduleForm(false);
    setRescheduleTime('');
    setCancelReason('');
    setStatusMessage(null);
    setActionError(null);
    setTimelineRefreshToken(0);
    void router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, bookingId: reservationId },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleCreateReservation = async () => {
    if (!createForm.clientName.trim()) {
      setCreateError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!createForm.serviceId) {
      setCreateError('Seleccioná un servicio.');
      return;
    }
    if (!createForm.date || !createForm.time) {
      setCreateError('Seleccioná fecha y hora.');
      return;
    }
    if (createForm.clientPhone.trim() && createForm.clientPhone.replace(/\D/g, '').length < 8) {
      setCreateError('Si cargás teléfono del cliente, ingresá un número válido.');
      return;
    }

    setIsCreatingReservation(true);
    setCreateError(null);
    setStatusMessage(null);
    setFetchError(null);

    try {
      const created = await createProfessionalReservation({
        clientName: createForm.clientName.trim(),
        clientEmail: createForm.clientEmail.trim() || undefined,
        clientPhone: createForm.clientPhone.trim() || undefined,
        serviceId: createForm.serviceId,
        startDateTime: `${createForm.date}T${createForm.time}:00`,
      });
      setStatusMessage('Reserva manual creada correctamente.');
      setShowCreateForm(false);
      setCreateForm((prev) => ({
        ...prev,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
      }));
      await loadReservations(false);
      setSelectedReservationId(created.id);
    } catch (error) {
      setCreateError(
        extractApiMessage(error, 'No se pudo crear la reserva manual.'),
      );
    } finally {
      setIsCreatingReservation(false);
    }
  };

  const runReservationAction = async (
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) => {
    setIsSubmittingAction(true);
    setStatusMessage(null);
    setActionError(null);

    try {
      const response = await action();
      const plainTextFallback =
        response && typeof response === 'object' && 'plainTextFallback' in response
          ? (response as { plainTextFallback?: string | null }).plainTextFallback
          : null;
      setStatusMessage(plainTextFallback || fallbackMessage);
      setShowRescheduleForm(false);
      setRescheduleTime('');
      setCancelReason('');
      await loadReservations();
      setTimelineRefreshToken((current) => current + 1);
    } catch (error) {
      setActionError(extractApiMessage(error, fallbackMessage));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  useProfessionalDashboardUnsavedSection({
    sectionId: 'reservations',
    isDirty: false,
    isSaving: isSubmittingAction || isCreatingReservation,
  });

  const renderReservationCard = (reservation: ProfessionalReservation) => {
    const financialCopy = getProfessionalFinancialStatusCopy(
      reservation.paymentType,
      reservation.financialSummary,
    );
    const status = reservation.status ?? 'pending';
    const reservationDateLabel = getReservationDisplayDate(reservation);

    return (
      <button
        key={reservation.id}
        type="button"
        onClick={() => handleSelectReservation(reservation.id)}
        className={`flex w-full items-center justify-between gap-4 rounded-[16px] border px-4 py-3 text-left transition ${
          reservation.id === selectedReservationId
            ? 'border-[#1FB6A6]/40 bg-[#F0FDFA]'
            : 'border-[#E2E7EC] bg-white hover:border-[#CBD5E1]'
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0E2A47]">
            {reservation.time || '--:--'} · {reservation.serviceName || 'Servicio'}
          </p>
          <p className="mt-1 truncate text-sm text-[#475569]">
            {reservation.clientName || 'Cliente'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${operationalStatusTone[status]}`}>
              {operationalStatusLabel[status]}
            </span>
            <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
              {getPaymentTypeLabel(reservation.paymentType)}
            </span>
            <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${financialCopy.tone}`}>
              {financialCopy.label}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-xs text-[#64748B]">{reservationDateLabel}</span>
      </button>
    );
  };

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-[color:var(--border-soft)] bg-[color:var(--sidebar-surface)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <ProfesionalSidebar profile={profile} active="Reservas" />
          </div>
        </aside>

        <div className="flex-1">
          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="space-y-6">
              <DashboardHero
                eyebrow="Reservas"
                icon="reservas"
                accent="teal"
                title="Reservas con estado operativo y financiero real"
                description="Revisá el estado actual de cada reserva, sus pagos y las acciones disponibles sin mezclar configuraciones de cobro."
                meta={(
                  <>
                    <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                      {todayReservations.length} para hoy
                    </span>
                    <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--text-on-dark-secondary)] backdrop-blur-sm">
                      {upcomingReservations.length} próximas
                    </span>
                  </>
                )}
                actions={(
                  <Button type="button" variant="contrast" onClick={() => setShowCreateForm((current) => !current)}>
                    {showCreateForm ? 'Cerrar alta manual' : 'Nueva reserva manual'}
                  </Button>
                )}
              />

              {statusMessage ? (
                <Card className="border-[#BFEDE7] bg-[#F0FDFA] p-4 text-sm text-[#0F766E]">
                  {statusMessage}
                </Card>
              ) : null}
              {fetchError ? (
                <Card className="border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
                  {fetchError}
                </Card>
              ) : null}

              {showCreateForm ? (
                <Card className="border-white/70 bg-white/95 p-5">
                  <DashboardSectionHeading
                    title="Reserva manual"
                    description="Sigue disponible para carga operativa, sin duplicar lógica de pagos en frontend."
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Cliente
                      <input
                        type="text"
                        value={createForm.clientName}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, clientName: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Servicio
                      <select
                        value={createForm.serviceId}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, serviceId: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                      >
                        <option value="">
                          {isLoadingServiceOptions ? 'Cargando servicios...' : 'Seleccioná un servicio'}
                        </option>
                        {serviceOptions.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Email
                      <input
                        type="email"
                        value={createForm.clientEmail}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, clientEmail: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Teléfono
                      <div className="mt-1.5">
                        <InternationalPhoneField
                          value={createForm.clientPhone}
                          onChange={(value) =>
                            setCreateForm((prev) => ({ ...prev, clientPhone: value }))
                          }
                          selectClassName="w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                          inputClassName="w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                          wrapperClassName="grid gap-3"
                          inputPlaceholder="11 2345 6789"
                        />
                      </div>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Fecha
                      <input
                        type="date"
                        min={todayKey}
                        value={createForm.date}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, date: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                      Hora
                      <input
                        type="time"
                        value={createForm.time}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, time: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                      />
                    </label>
                  </div>
                  {createError ? (
                    <p className="mt-4 text-sm text-[#B91C1C]">{createError}</p>
                  ) : null}
                  <Button
                    type="button"
                    onClick={handleCreateReservation}
                    className="mt-4"
                    disabled={isCreatingReservation}
                  >
                    {isCreatingReservation ? 'Creando reserva...' : 'Crear reserva'}
                  </Button>
                </Card>
              ) : null}

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
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardStatCard
                      label="Hoy"
                      value={`${todayReservations.length}`}
                      detail="Reservas activas del día"
                      icon="agenda"
                      tone="warm"
                    />
                    <DashboardStatCard
                      label="Próximas"
                      value={`${upcomingReservations.length}`}
                      detail="Agenda futura activa"
                      icon="reservas"
                      tone="accent"
                    />
                    <DashboardStatCard
                      label="Cerradas"
                      value={`${closedReservations.length}`}
                      detail="Completadas o no-show"
                      icon="check"
                    />
                    <DashboardStatCard
                      label="Canceladas"
                      value={`${cancelledReservations.length}`}
                      detail="Historial de cancelación"
                      icon="warning"
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="space-y-6">
                      <Card className="border-white/70 bg-white/95 p-5">
                        <DashboardSectionHeading
                          title="Reservas de hoy"
                          description="Prioridad operativa y financiera para lo inmediato."
                        />
                        <div className="mt-4 space-y-3">
                          {todayReservations.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              No tenés reservas activas para hoy.
                            </div>
                          ) : (
                            todayReservations.map(renderReservationCard)
                          )}
                        </div>
                      </Card>

                      <Card className="border-white/70 bg-white/95 p-5">
                        <DashboardSectionHeading
                          title="Próximas reservas"
                          description="Reservas futuras activas con su estado financiero."
                        />
                        <div className="mt-4 space-y-3">
                          {upcomingReservations.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              No hay reservas futuras activas.
                            </div>
                          ) : (
                            upcomingReservations.map(renderReservationCard)
                          )}
                        </div>
                      </Card>

                      <Card className="border-white/70 bg-white/95 p-5">
                        <DashboardSectionHeading
                          title="Reservas cerradas"
                          description="Completadas o marcadas como no-show."
                        />
                        <div className="mt-4 space-y-3">
                          {closedReservations.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              Todavía no hay reservas cerradas.
                            </div>
                          ) : (
                            closedReservations.map(renderReservationCard)
                          )}
                        </div>
                      </Card>

                      <Card className="border-white/70 bg-white/95 p-5">
                        <DashboardSectionHeading
                          title="Canceladas"
                          description="Seguimiento de cancelaciones ya cerradas."
                        />
                        <div className="mt-4 space-y-3">
                          {cancelledReservations.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              No hay reservas canceladas.
                            </div>
                          ) : (
                            cancelledReservations.map(renderReservationCard)
                          )}
                        </div>
                      </Card>
                    </div>

                    <aside className="xl:sticky xl:top-24 xl:self-start">
                      <Card className="border-white/70 bg-white/95 p-5">
                        {!selectedReservation ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            Seleccioná una reserva para ver su detalle.
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">
                                  Detalle
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                                  {selectedReservation.serviceName || 'Servicio'}
                                </h2>
                                <p className="mt-1 text-sm text-[#64748B]">
                                  {selectedReservation.clientName || 'Cliente'}
                                </p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${operationalStatusTone[selectedReservation.status ?? 'pending']}`}>
                                {operationalStatusLabel[selectedReservation.status ?? 'pending']}
                              </span>
                            </div>

                            <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                                  {getPaymentTypeLabel(selectedReservation.paymentType)}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${selectedFinancialCopy.tone}`}>
                                  {selectedFinancialCopy.label}
                                </span>
                              </div>
                              <p className="mt-3 text-sm text-[#475569]">{selectedFinancialCopy.detail}</p>

                              <div className="mt-4 space-y-2 text-sm text-[#64748B]">
                                <p>
                                  Fecha:{' '}
                                  <span className="font-semibold text-[#0E2A47]">
                                    {selectedReservationDateLabel} · {selectedReservationTimeLabel}
                                  </span>
                                </p>
                                {selectedReservation.financialSummary?.amountHeld ? (
                                  <p>
                                    Retenido:{' '}
                                    <span className="font-semibold text-[#0E2A47]">
                                      {formatBookingMoney(
                                        selectedReservation.financialSummary.amountHeld,
                                        selectedReservation.financialSummary.currency,
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                                {selectedReservation.financialSummary?.amountToRelease ? (
                                  <p>
                                    Pendiente de liberar:{' '}
                                    <span className="font-semibold text-[#0E2A47]">
                                      {formatBookingMoney(
                                        selectedReservation.financialSummary.amountToRelease,
                                        selectedReservation.financialSummary.currency,
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                                {selectedReservation.financialSummary?.amountReleased ? (
                                  <p>
                                    Liberado:{' '}
                                    <span className="font-semibold text-[#0E2A47]">
                                      {formatBookingMoney(
                                        selectedReservation.financialSummary.amountReleased,
                                        selectedReservation.financialSummary.currency,
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                                <p>
                                  Refund:{' '}
                                  <span className="font-semibold text-[#0E2A47]">
                                    {getRefundStatusCopy(selectedReservation.refundStatus)}
                                  </span>
                                </p>
                                <p>
                                  Liquidación:{' '}
                                  <span className="font-semibold text-[#0E2A47]">
                                    {getBookingPayoutStatusCopy(selectedReservation.payoutStatus)}
                                  </span>
                                </p>
                                <p>
                                  Política:{' '}
                                  <span className="font-semibold text-[#0E2A47]">
                                    {describeBookingPolicy(selectedReservation.policySnapshot)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">
                                Consecuencias backend
                              </p>
                              {isLoadingActions ? (
                                <p className="mt-3 text-sm text-[#64748B]">Cargando acciones…</p>
                              ) : actionError ? (
                                <p className="mt-3 text-sm text-[#B91C1C]">{actionError}</p>
                              ) : (
                                <>
                                  <p className="mt-3 text-sm text-[#475569]">
                                    {actions?.plainTextFallback || 'Sin mensajes adicionales para esta reserva.'}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {typeof actions?.refundPreviewAmount === 'number' ? (
                                      <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-[0.72rem] font-semibold text-[#1D4ED8]">
                                        Vista previa devolución: {formatBookingMoney(actions.refundPreviewAmount, actions.currency)}
                                      </span>
                                    ) : null}
                                    {typeof actions?.retainPreviewAmount === 'number' && actions.retainPreviewAmount > 0 ? (
                                      <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[0.72rem] font-semibold text-[#B45309]">
                                        Retención: {formatBookingMoney(actions.retainPreviewAmount, actions.currency)}
                                      </span>
                                    ) : null}
                                  </div>
                                </>
                              )}
                            </div>

                            <ProfessionalBookingTimeline
                              bookingId={selectedReservation.id}
                              refreshToken={timelineRefreshToken}
                            />

                            {actions?.canCancel ? (
                              <div className="mt-4 rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
                                <p className="text-sm font-semibold text-[#92400E]">Cancelar reserva</p>
                                <textarea
                                  value={cancelReason}
                                  onChange={(event) => setCancelReason(event.target.value)}
                                  placeholder="Motivo opcional"
                                  className="mt-3 min-h-24 w-full rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#F59E0B]"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="mt-3 w-full"
                                  disabled={isSubmittingAction}
                                  onClick={() =>
                                    runReservationAction(
                                      () => cancelProfessionalBooking(selectedReservation.id, cancelReason),
                                      'No se pudo cancelar la reserva.',
                                    )
                                  }
                                >
                                  {isSubmittingAction ? 'Cancelando...' : 'Cancelar'}
                                </Button>
                              </div>
                            ) : null}

                            {actions?.canReschedule && profile?.slug && selectedReservation.serviceId ? (
                              <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-[#0E2A47]">Reagendar</p>
                                  <button
                                    type="button"
                                    onClick={() => setShowRescheduleForm((current) => !current)}
                                    className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#475569]"
                                  >
                                    {showRescheduleForm ? 'Cerrar' : 'Elegir horario'}
                                  </button>
                                </div>

                                {showRescheduleForm ? (
                                  <div className="mt-4 space-y-4">
                                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                      Fecha
                                      <input
                                        type="date"
                                        min={todayKey}
                                        value={rescheduleDate}
                                        onChange={(event) => setRescheduleDate(event.target.value)}
                                        className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                                      />
                                    </label>

                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                                        Horarios disponibles
                                      </p>
                                      <div className="grid grid-cols-3 gap-2">
                                        {isLoadingSlots ? (
                                          <p className="col-span-full text-sm text-[#64748B]">Buscando horarios...</p>
                                        ) : slotOptions.length === 0 ? (
                                          <p className="col-span-full text-sm text-[#64748B]">
                                            No encontramos horarios para esa fecha.
                                          </p>
                                        ) : (
                                          slotOptions.map((slot) => (
                                            <button
                                              key={slot}
                                              type="button"
                                              onClick={() => setRescheduleTime(slot)}
                                              className={`rounded-[10px] border px-2 py-1.5 text-sm font-semibold transition ${
                                                rescheduleTime === slot
                                                  ? 'border-[#1FB6A6] bg-[#1FB6A6] text-white'
                                                  : 'border-[#E2E7EC] bg-white text-[#0E2A47]'
                                              }`}
                                            >
                                              {slot}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <Button
                                      type="button"
                                      className="w-full"
                                      disabled={isSubmittingAction || !rescheduleTime}
                                      onClick={() =>
                                        runReservationAction(
                                          () => rescheduleProfessionalBooking(
                                            selectedReservation.id,
                                            `${rescheduleDate}T${rescheduleTime}:00`,
                                            selectedReservation.timezone || undefined,
                                          ),
                                          'No se pudo reagendar la reserva.',
                                        )
                                      }
                                    >
                                      {isSubmittingAction ? 'Guardando cambio...' : 'Confirmar nuevo horario'}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-4 grid gap-3">
                              {canConfirm ? (
                                <Button
                                  type="button"
                                  disabled={isSubmittingAction}
                                  onClick={() =>
                                    runReservationAction(
                                      () => updateProfessionalReservationStatus(selectedReservation.id, 'confirmed'),
                                      'No se pudo confirmar la reserva.',
                                    )
                                  }
                                >
                                  {isSubmittingAction ? 'Confirmando...' : 'Confirmar reserva'}
                                </Button>
                              ) : null}

                              {actions?.canMarkNoShow ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={isSubmittingAction}
                                  onClick={() =>
                                    runReservationAction(
                                      () => markProfessionalBookingNoShow(selectedReservation.id),
                                      'No se pudo marcar no-show.',
                                    )
                                  }
                                >
                                  {isSubmittingAction ? 'Marcando...' : 'Marcar NO_SHOW'}
                                </Button>
                              ) : null}
                            </div>
                          </>
                        )}
                      </Card>
                    </aside>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
