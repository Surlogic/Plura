'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  getProfessionalReservationsForDates,
  updateProfessionalReservationStatus,
} from '@/services/professionalBookings';
import type {
  ProfessionalReservation,
  ReservationStatus,
} from '@/types/professional';

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

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

const transitionActions: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const actionLabel: Record<ReservationStatus, string> = {
  pending: 'Marcar pendiente',
  confirmed: 'Confirmar',
  completed: 'Completar',
  cancelled: 'Cancelar',
};

const actionStyles: Record<ReservationStatus, string> = {
  pending:
    'rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-4 py-2 text-sm font-semibold text-[#92400E] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60',
  confirmed:
    'rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60',
  completed:
    'rounded-full border border-[#0B1D2A] bg-[#0B1D2A]/10 px-4 py-2 text-sm font-semibold text-[#0B1D2A] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60',
  cancelled:
    'rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60',
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

  const todayKey = toLocalDateKey(new Date());
  const nowMinutes =
    parseTimeToMinutes(
      new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    ) ?? 0;

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

  const { todayReservations, upcomingReservations, pastReservations } = useMemo(() => {
    const today: ProfessionalReservation[] = [];
    const upcoming: ProfessionalReservation[] = [];
    const past: ProfessionalReservation[] = [];

    reservations.forEach((reservation) => {
      if (!reservation.date) return;
      const dateKey = reservation.date;
      if (dateKey < todayKey) {
        past.push(reservation);
        return;
      }
      if (dateKey > todayKey) {
        upcoming.push(reservation);
        return;
      }

      const reservationMinutes = reservation.time
        ? parseTimeToMinutes(reservation.time) ?? 0
        : 0;
      if (reservationMinutes < nowMinutes) {
        past.push(reservation);
      } else {
        today.push(reservation);
      }
    });

    const sortByDateTime = (a: ProfessionalReservation, b: ProfessionalReservation) => {
      const dateA = parseReservationDate(a)?.getTime() ?? 0;
      const dateB = parseReservationDate(b)?.getTime() ?? 0;
      return dateA - dateB;
    };

    return {
      todayReservations: today.sort(sortByDateTime),
      upcomingReservations: upcoming.sort(sortByDateTime),
      pastReservations: past.sort(sortByDateTime),
    };
  }, [reservations, todayKey, nowMinutes]);

  const availableActions = useMemo(() => {
    if (!selectedReservation) return [] as ReservationStatus[];
    const currentStatus = selectedReservation.status ?? 'pending';
    return transitionActions[currentStatus] ?? [];
  }, [selectedReservation]);

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

  const closeDrawer = () => {
    setDrawerVisible(false);
    window.setTimeout(() => {
      setSelectedReservation(null);
    }, 200);
  };

  const openDetailDrawer = (reservation: ProfessionalReservation) => {
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

  const renderReservationCard = (reservation: ProfessionalReservation) => {
    const status = reservation.status ?? 'pending';

    return (
      <button
        key={reservation.id}
        type="button"
        onClick={() => openDetailDrawer(reservation)}
        className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-[#E2E7EC] bg-white px-4 py-2 text-left text-sm text-[#0E2A47] transition hover:border-[#CBD5F5] hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{reservation.serviceName}</p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            {reservation.date} · {reservation.time} · {reservation.clientName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <div className="flex min-h-screen flex-col">
        <Navbar variant="dashboard" showMenuButton onMenuClick={handleToggleMenu} />
        <div className="flex flex-1">
          <aside className="hidden w-[260px] shrink-0 border-r border-[#0E2A47]/10 bg-[#0B1D2A] lg:block">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <ProfesionalSidebar profile={profile} active="Reservas" />
            </div>
          </aside>
          <div className="flex-1">
            {isMenuOpen ? (
              <div className="border-b border-[#0E2A47]/10 bg-[#0B1D2A] lg:hidden">
                <ProfesionalSidebar profile={profile} active="Reservas" />
              </div>
            ) : null}
            <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="space-y-6">
                <div className="border-b border-[#E2E7EC] bg-white/90 px-4 py-6 sm:px-6 lg:px-10">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Reservas
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                      Gestión de reservas
                    </h1>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Consultá tus turnos en tiempo real y actualizá su estado.
                    </p>
                  </div>
                  {statusMessage ? (
                    <p className="mt-3 text-sm text-[#1FB6A6]">{statusMessage}</p>
                  ) : null}
                  {fetchError ? (
                    <p className="mt-3 text-sm text-[#DC2626]">{fetchError}</p>
                  ) : null}
                </div>

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
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                          Hoy
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                          {todayReservations.length}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                          Próximas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                          {upcomingReservations.length}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                          Pasadas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                          {pastReservations.length}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <h2 className="text-lg font-semibold text-[#0E2A47]">
                        Reservas de hoy
                      </h2>
                      <div className="mt-4 space-y-3">
                        {todayReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No tenés reservas para hoy.
                          </div>
                        ) : (
                          todayReservations.map(renderReservationCard)
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <h2 className="text-lg font-semibold text-[#0E2A47]">
                        Próximas reservas
                      </h2>
                      <div className="mt-4 space-y-3">
                        {upcomingReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No hay reservas próximas.
                          </div>
                        ) : (
                          upcomingReservations.map(renderReservationCard)
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                      <h2 className="text-lg font-semibold text-[#0E2A47]">
                        Reservas pasadas
                      </h2>
                      <div className="mt-4 space-y-3">
                        {pastReservations.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                            No hay reservas pasadas.
                          </div>
                        ) : (
                          pastReservations.map(renderReservationCard)
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
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
            className={`relative flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-white p-6 shadow-[-12px_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
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

            <div className="mt-8 grid gap-3">
              {availableActions.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-[#E2E7EC] px-4 py-3 text-sm text-[#64748B]">
                  Esta reserva no permite más cambios de estado.
                </p>
              ) : (
                availableActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleUpdateStatus(action)}
                    disabled={isUpdatingStatus}
                    className={actionStyles[action]}
                  >
                    {actionLabel[action]}
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
