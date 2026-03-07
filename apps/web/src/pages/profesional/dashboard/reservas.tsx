'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import { useProfessionalDashboardUnsavedSection } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import {
  DashboardHero,
  DashboardSectionHeading,
  DashboardStatCard,
} from '@/components/profesional/dashboard/DashboardUI';
import {
  createProfessionalReservation,
  getProfessionalReservationsForDates,
  listProfessionalServices,
  updateProfessionalReservationStatus,
} from '@/services/professionalBookings';
import type {
  ProfessionalReservation,
  ReservationStatus,
} from '@/types/professional';

type DashboardServiceOption = {
  id: string;
  name: string;
};

type ReservationCardVariant = 'default' | 'cancelled';

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

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const parseReservationDate = (reservation: ProfessionalReservation) => {
  const dateTime = new Date(`${reservation.date}T${reservation.time || '00:00'}`);
  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }
  return dateTime;
};

const statusLabel: Record<ReservationStatus, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const statusStyles: Record<ReservationStatus, string> = {
  confirmed: 'bg-[#1FB6A6]/10 text-[#1FB6A6]',
  pending: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  completed: 'bg-[#0B1D2A]/10 text-[#0B1D2A]',
  cancelled: 'bg-[#EF4444]/10 text-[#EF4444]',
};

const TODAY_PRIORITY: Record<ReservationStatus, number> = {
  pending: 0,
  confirmed: 1,
  completed: 2,
  cancelled: 3,
};

const resolveBackendMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

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

const isActiveStatus = (status: ReservationStatus) => ACTIVE_STATUSES.includes(status);

const buildCreateReservationPayload = (form: ReservationCreateForm) => {
  const normalizedTime = form.time.length === 5 ? `${form.time}:00` : form.time;
  return {
    clientName: form.clientName.trim(),
    clientEmail: form.clientEmail.trim() || undefined,
    clientPhone: form.clientPhone.trim() || undefined,
    serviceId: form.serviceId,
    startDateTime: `${form.date}T${normalizedTime}`,
  };
};

export default function ProfesionalReservationsPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<ProfessionalReservation | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showCancelledReservations, setShowCancelledReservations] = useState(false);

  const [serviceOptions, setServiceOptions] = useState<DashboardServiceOption[]>([]);
  const [isLoadingServiceOptions, setIsLoadingServiceOptions] = useState(false);

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
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
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isReschedulingReservation, setIsReschedulingReservation] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const todayKey = toLocalDateKey(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const reservationDates = useMemo(() => buildDateWindow(30, 90), [todayKey]);

  useEffect(() => {
    if (!profile?.id) return;

    let isCancelled = false;
    setIsLoadingReservations(true);
    setFetchError(null);

    getProfessionalReservationsForDates(reservationDates)
      .then((response) => {
        if (isCancelled) return;
        setReservations(response);
      })
      .catch((error) => {
        if (isCancelled) return;
        setReservations([]);
        setFetchError(
          resolveBackendMessage(error, 'No se pudieron cargar las reservas.'),
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingReservations(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [profile?.id, reservationDates]);

  useEffect(() => {
    if (!profile?.id) return;

    let isCancelled = false;
    setIsLoadingServiceOptions(true);

    listProfessionalServices()
      .then((response) => {
        if (isCancelled) return;
        const mapped = response.map((service) => ({
          id: service.id,
          name: service.name,
        }));
        setServiceOptions(mapped);
        setCreateForm((prev) => {
          if (prev.serviceId || mapped.length === 0) return prev;
          return { ...prev, serviceId: mapped[0].id };
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setServiceOptions([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingServiceOptions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [profile?.id]);

  const {
    todayReservations,
    upcomingReservations,
    completedReservations,
    cancelledReservations,
  } = useMemo(() => {
    const today: ProfessionalReservation[] = [];
    const upcoming: ProfessionalReservation[] = [];
    const completed: ProfessionalReservation[] = [];
    const cancelled: ProfessionalReservation[] = [];

    reservations.forEach((reservation) => {
      if (!reservation.date) return;

      const status = reservation.status ?? 'pending';
      if (status === 'cancelled') {
        cancelled.push(reservation);
        return;
      }

      const dateKey = reservation.date;
      const reservationMinutes = reservation.time
        ? parseTimeToMinutes(reservation.time) ?? 0
        : 0;

      const isPastDay = dateKey < todayKey;
      const isFutureDay = dateKey > todayKey;
      const isPastTodayTime = dateKey === todayKey && reservationMinutes < nowMinutes;

      if (isActiveStatus(status)) {
        if (dateKey === todayKey && !isPastTodayTime) {
          today.push(reservation);
          return;
        }

        if (isFutureDay) {
          upcoming.push(reservation);
          return;
        }
      }

      if (status === 'completed' || isPastDay || isPastTodayTime || dateKey === todayKey) {
        completed.push(reservation);
        return;
      }

      upcoming.push(reservation);
    });

    const sortByDateTimeAsc = (a: ProfessionalReservation, b: ProfessionalReservation) => {
      const dateA = parseReservationDate(a)?.getTime() ?? 0;
      const dateB = parseReservationDate(b)?.getTime() ?? 0;
      return dateA - dateB;
    };

    const sortByDateTimeDesc = (a: ProfessionalReservation, b: ProfessionalReservation) => {
      const dateA = parseReservationDate(a)?.getTime() ?? 0;
      const dateB = parseReservationDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    };

    const sortToday = (a: ProfessionalReservation, b: ProfessionalReservation) => {
      const statusA = a.status ?? 'pending';
      const statusB = b.status ?? 'pending';
      const byPriority = TODAY_PRIORITY[statusA] - TODAY_PRIORITY[statusB];
      if (byPriority !== 0) return byPriority;
      return sortByDateTimeAsc(a, b);
    };

    return {
      todayReservations: today.sort(sortToday),
      upcomingReservations: upcoming.sort(sortByDateTimeAsc),
      completedReservations: completed.sort(sortByDateTimeDesc),
      cancelledReservations: cancelled.sort(sortByDateTimeDesc),
    };
  }, [reservations, todayKey, nowMinutes]);

  const showSkeleton =
    !hasLoaded ||
    (isLoading && !profile) ||
    (isLoadingReservations && reservations.length === 0);

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (selectedReservation) {
      const frame = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setDrawerVisible(false);
    return undefined;
  }, [selectedReservation]);

  useEffect(() => {
    if (isCreateDrawerOpen) {
      const frame = requestAnimationFrame(() => setCreateDrawerVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setCreateDrawerVisible(false);
    return undefined;
  }, [isCreateDrawerOpen]);

  const closeDrawer = () => {
    setDrawerVisible(false);
    setShowRescheduleForm(false);
    setRescheduleError(null);
    window.setTimeout(() => {
      setSelectedReservation(null);
    }, 200);
  };

  const openCreateDrawer = () => {
    setCreateError(null);
    setStatusMessage(null);
    setFetchError(null);

    const futureDateTime = toDefaultFutureDateTime();
    setCreateForm((prev) => ({
      ...prev,
      serviceId: prev.serviceId || serviceOptions[0]?.id || '',
      date: futureDateTime.date,
      time: futureDateTime.time,
    }));
    setIsCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    setCreateDrawerVisible(false);
    window.setTimeout(() => {
      setIsCreateDrawerOpen(false);
    }, 200);
  };

  const openDetailDrawer = (reservation: ProfessionalReservation) => {
    setRescheduleDate(reservation.date || toLocalDateKey(new Date()));
    setRescheduleTime(reservation.time || '09:00');
    setShowRescheduleForm(false);
    setRescheduleError(null);
    setSelectedReservation(reservation);
  };

  const handleUpdateStatus = async (status: ReservationStatus) => {
    if (!selectedReservation) return;

    setIsUpdatingStatus(true);
    setFetchError(null);
    setStatusMessage(null);

    try {
      const updated = await updateProfessionalReservationStatus(
        selectedReservation.id,
        status,
      );

      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === updated.id
            ? { ...reservation, ...updated }
            : reservation,
        ),
      );
      setSelectedReservation((prev) =>
        prev && prev.id === updated.id ? { ...prev, ...updated } : prev,
      );
      setStatusMessage('Estado de reserva actualizado.');
    } catch (error) {
      setFetchError(
        resolveBackendMessage(
          error,
          'No se pudo actualizar el estado de la reserva.',
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
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

    setIsCreatingReservation(true);
    setCreateError(null);
    setFetchError(null);
    setStatusMessage(null);

    try {
      const created = await createProfessionalReservation(
        buildCreateReservationPayload(createForm),
      );

      setReservations((prev) => [...prev, created]);
      setStatusMessage('Reserva creada correctamente.');
      closeCreateDrawer();
      setCreateForm((prev) => ({
        ...prev,
        clientName: '',
        clientEmail: '',
        clientPhone: '',
      }));
    } catch (error) {
      setCreateError(
        resolveBackendMessage(
          error,
          'No se pudo crear la reserva manual.',
        ),
      );
    } finally {
      setIsCreatingReservation(false);
    }
  };

  const handleRescheduleReservation = async () => {
    if (!selectedReservation) return;
    if (!selectedReservation.serviceId) {
      setRescheduleError('Esta reserva no tiene servicio asociado para reprogramar.');
      return;
    }
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Seleccioná fecha y hora para la reprogramación.');
      return;
    }

    setIsReschedulingReservation(true);
    setRescheduleError(null);
    setFetchError(null);
    setStatusMessage(null);

    try {
      const created = await createProfessionalReservation({
        clientName: (selectedReservation.clientName || 'Cliente').trim(),
        serviceId: selectedReservation.serviceId,
        startDateTime: `${rescheduleDate}T${rescheduleTime}:00`,
      });

      setReservations((prev) => [...prev, created]);

      try {
        const cancelled = await updateProfessionalReservationStatus(
          selectedReservation.id,
          'cancelled',
        );

        setReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === cancelled.id
              ? { ...reservation, ...cancelled }
              : reservation,
          ),
        );

        setStatusMessage('Reserva reprogramada correctamente.');
        closeDrawer();
      } catch (cancelError) {
        setStatusMessage(
          'Se creó la nueva reserva, pero no se pudo cancelar la anterior. Revisala manualmente.',
        );
        setFetchError(
          resolveBackendMessage(
            cancelError,
            'No se pudo cancelar la reserva anterior.',
          ),
        );
      }
    } catch (error) {
      setRescheduleError(
        resolveBackendMessage(
          error,
          'No se pudo reprogramar la reserva.',
        ),
      );
    } finally {
      setIsReschedulingReservation(false);
    }
  };

  useProfessionalDashboardUnsavedSection({
    sectionId: 'reservations',
    isDirty: false,
    isSaving: isUpdatingStatus || isCreatingReservation || isReschedulingReservation,
  });

  const renderReservationCard = (
    reservation: ProfessionalReservation,
    variant: ReservationCardVariant = 'default',
  ) => {
    const status = reservation.status ?? 'pending';
    const isCancelledVariant = variant === 'cancelled';

    return (
      <button
        key={reservation.id}
        type="button"
        onClick={() => openDetailDrawer(reservation)}
        className={`flex w-full items-center justify-between gap-4 rounded-[14px] border bg-white px-4 py-3 text-left text-sm text-[#0E2A47] transition ${
          isCancelledVariant
            ? 'border-dashed border-[#CBD5E1] opacity-65 hover:opacity-80'
            : 'border-[#E2E7EC] hover:border-[#CBD5F5] hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-[#0E2A47]">{reservation.time || '--:--'}</p>
          <p className="truncate font-semibold text-[#1E293B]">{reservation.serviceName || 'Servicio'}</p>
          <p className="truncate text-xs text-[#64748B]">{reservation.clientName || 'Cliente sin nombre'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-[#64748B]">{reservation.date}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusStyles[status]}`}
          >
            {statusLabel[status]}
          </span>
          {reservation.price ? (
            <span className="text-sm font-semibold text-[#1FB6A6]">
              {reservation.price.includes('$')
                ? reservation.price
                : `$${reservation.price}`}
            </span>
          ) : null}
        </div>
      </button>
    );
  };

  const selectedStatus = selectedReservation?.status ?? 'pending';
  const selectedCanConfirm = selectedStatus === 'pending';
  const selectedCanCancel = selectedStatus === 'pending' || selectedStatus === 'confirmed';
  const selectedCanReschedule =
    selectedCanCancel &&
    Boolean(selectedReservation?.serviceId);
  const selectedIsImmutable =
    selectedStatus === 'cancelled' || selectedStatus === 'completed';
  const pendingTodayCount = todayReservations.filter(
    (reservation) => (reservation.status ?? 'pending') === 'pending',
  ).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Reservas" />
            </div>
          </aside>
          <div className="flex-1">
            <div className="px-4 pt-4 sm:px-6 lg:hidden">
              <Button type="button" size="sm" onClick={handleToggleMenu}>
                {isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              </Button>
            </div>
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Reservas" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="space-y-6">
                <DashboardHero
                  eyebrow="Gestión diaria"
                  icon="reservas"
                  accent="teal"
                  title="Reservas priorizadas por urgencia y estado"
                  description="Separá lo que necesita atención ahora, resolvé reprogramaciones y cargá reservas manuales sin perder contexto."
                  meta={
                    <>
                      <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                        {todayReservations.length} para hoy
                      </span>
                      <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                        {pendingTodayCount} pendientes
                      </span>
                    </>
                  }
                  actions={(
                    <Button type="button" variant="contrast" onClick={openCreateDrawer}>
                      Nueva reserva manual
                    </Button>
                  )}
                />

                <Card className="border-white/70 bg-white/95 p-5">
                  <DashboardSectionHeading
                    eyebrow="Vista general"
                    title="Estado del pipeline de atención"
                    description="Detectá volumen, carga futura e historial sin recorrer toda la lista."
                  />
                  {statusMessage ? (
                    <p className="mt-3 text-sm text-[#1FB6A6]">{statusMessage}</p>
                  ) : null}
                  {fetchError ? (
                    <p className="mt-3 text-sm text-[#DC2626]">{fetchError}</p>
                  ) : null}
                </Card>

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
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <DashboardStatCard
                        label="Hoy"
                        value={`${todayReservations.length}`}
                        detail={pendingTodayCount > 0 ? `${pendingTodayCount} pendientes por confirmar` : 'Agenda de hoy ordenada'}
                        icon="agenda"
                        tone="warm"
                      />
                      <DashboardStatCard
                        label="Próximas"
                        value={`${upcomingReservations.length}`}
                        detail="Reservas futuras activas"
                        icon="reservas"
                        tone="accent"
                      />
                      <DashboardStatCard
                        label="Completadas"
                        value={`${completedReservations.length}`}
                        detail="Historial reciente"
                        icon="check"
                      />
                      <DashboardStatCard
                        label="Canceladas"
                        value={`${cancelledReservations.length}`}
                        detail="Seguimiento de churn operativo"
                        icon="warning"
                      />
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <DashboardSectionHeading
                        title="Reservas de hoy"
                        description="Primero lo inmediato: clientes que todavía necesitan atención hoy."
                      />
                      <div className="mt-4 space-y-3">
                        {todayReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No tenés reservas activas para hoy.
                          </div>
                        ) : (
                          todayReservations.map((reservation) =>
                            renderReservationCard(reservation),
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <DashboardSectionHeading
                        title="Próximas reservas"
                        description="Carga futura ya confirmada o pendiente para los próximos días."
                      />
                      <div className="mt-4 space-y-3">
                        {upcomingReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No hay reservas futuras activas.
                          </div>
                        ) : (
                          upcomingReservations.map((reservation) =>
                            renderReservationCard(reservation),
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <DashboardSectionHeading
                        title="Reservas completadas"
                        description="Historial cerrado para revisar volumen y consistencia operativa."
                      />
                      <div className="mt-4 space-y-3">
                        {completedReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No hay historial de completadas.
                          </div>
                        ) : (
                          completedReservations.map((reservation) =>
                            renderReservationCard(reservation),
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <button
                        type="button"
                        onClick={() => setShowCancelledReservations((prev) => !prev)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <h2 className="text-lg font-semibold text-[#0E2A47]">
                          Canceladas ({cancelledReservations.length})
                        </h2>
                        <span className="rounded-full border border-[#CBD5E1] px-3 py-1 text-xs font-semibold text-[#64748B]">
                          {showCancelledReservations ? 'Ocultar' : 'Ver'}
                        </span>
                      </button>

                      {showCancelledReservations ? (
                        <div className="mt-4 space-y-3">
                          {cancelledReservations.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                              No hay reservas canceladas.
                            </div>
                          ) : (
                            cancelledReservations.map((reservation) =>
                              renderReservationCard(reservation, 'cancelled'),
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      {selectedReservation ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className={`absolute inset-0 bg-[#0B1D2A]/40 backdrop-blur-sm transition-opacity duration-200 ${
              drawerVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={closeDrawer}
            aria-label="Cerrar panel de reserva"
          />
          <aside
            className={`relative flex h-full w-full max-w-[440px] flex-col overflow-y-auto bg-white p-6 shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Reserva
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                  {selectedReservation.serviceName || 'Servicio'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusStyles[selectedReservation.status ?? 'pending']
                }`}
              >
                {statusLabel[selectedReservation.status ?? 'pending']}
              </span>
              <span className="text-xs text-[#64748B]">
                {selectedReservation.date} · {selectedReservation.time}
              </span>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[#64748B]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Cliente
                </p>
                <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                  {selectedReservation.clientName || 'Cliente sin nombre'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Precio
                </p>
                <p className="mt-1 text-base font-semibold text-[#0E2A47]">
                  {selectedReservation.price
                    ? selectedReservation.price.includes('$')
                      ? selectedReservation.price
                      : `$${selectedReservation.price}`
                    : 'A definir'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Nota
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  {selectedReservation.notes || 'Sin notas adicionales.'}
                </p>
              </div>
            </div>

            {selectedIsImmutable ? (
              <div className="mt-8 rounded-[14px] border border-dashed border-[#E2E7EC] px-4 py-3 text-sm text-[#64748B]">
                Esta reserva no permite acciones adicionales.
              </div>
            ) : (
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('confirmed')}
                  disabled={isUpdatingStatus || !selectedCanConfirm}
                  className="w-full rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescheduleForm((prev) => !prev)}
                  disabled={isReschedulingReservation || !selectedCanReschedule}
                  className="w-full rounded-full border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={isUpdatingStatus || !selectedCanCancel}
                  className="w-full rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            )}

            {showRescheduleForm && selectedCanReschedule ? (
              <div className="mt-6 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">
                  Reprogramar reserva
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                    Fecha
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={todayKey}
                      onChange={(event) => setRescheduleDate(event.target.value)}
                      className="mt-1 w-full rounded-[10px] border border-[#D9E2EC] bg-white px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                    Hora
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(event) => setRescheduleTime(event.target.value)}
                      className="mt-1 w-full rounded-[10px] border border-[#D9E2EC] bg-white px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                    />
                  </label>
                </div>
                {rescheduleError ? (
                  <p className="mt-3 text-sm text-[#DC2626]">{rescheduleError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleRescheduleReservation}
                  disabled={isReschedulingReservation}
                  className="mt-4 w-full rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isReschedulingReservation ? 'Reprogramando...' : 'Guardar reprogramación'}
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {isCreateDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className={`absolute inset-0 bg-[#0B1D2A]/40 backdrop-blur-sm transition-opacity duration-200 ${
              createDrawerVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={closeCreateDrawer}
            aria-label="Cerrar creación de reserva"
          />
          <aside
            className={`relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white p-6 shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
              createDrawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                  Reserva manual
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                  Nueva reserva
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreateDrawer}
                className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                Cliente
                <input
                  type="text"
                  value={createForm.clientName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, clientName: event.target.value }))
                  }
                  placeholder="Nombre y apellido"
                  className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                Email (opcional)
                <input
                  type="email"
                  value={createForm.clientEmail}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, clientEmail: event.target.value }))
                  }
                  placeholder="cliente@email.com"
                  className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                Teléfono (opcional)
                <input
                  type="text"
                  value={createForm.clientPhone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, clientPhone: event.target.value }))
                  }
                  placeholder="099 123 456"
                  className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                Servicio
                <select
                  value={createForm.serviceId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, serviceId: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                  Fecha
                  <input
                    type="date"
                    min={todayKey}
                    value={createForm.date}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
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
                    className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                  />
                </label>
              </div>
            </div>

            {createError ? (
              <p className="mt-4 text-sm text-[#DC2626]">{createError}</p>
            ) : null}

            <button
              type="button"
              onClick={handleCreateReservation}
              disabled={isCreatingReservation}
              className="mt-6 w-full rounded-full bg-[#0B1D2A] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingReservation ? 'Creando reserva...' : 'Crear reserva'}
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
