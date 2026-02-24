'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import ProfesionalSidebar from '@/components/profesional/Sidebar';
import { useProfessionalProfile } from '@/hooks/useProfessionalProfile';
import {
  loadProfessionalReservations,
  saveProfessionalReservations,
} from '@/lib/professionalReservations';
import type {
  ProfessionalReservation,
  ReservationStatus,
} from '@/types/professional';

const toLocalDateKey = (date: Date) =>
  date.toLocaleDateString('en-CA');

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

export default function ProfesionalReservationsPage() {
  const { profile, isLoading, hasLoaded } = useProfessionalProfile();
  const [reservations, setReservations] = useState<ProfessionalReservation[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    serviceName: '',
    clientName: '',
    date: '',
    time: '',
    price: '',
    duration: '',
    status: 'confirmed' as ReservationStatus,
    notes: '',
  });

  useEffect(() => {
    if (!profile?.id || hasInitialized) return;
    const stored = loadProfessionalReservations(profile.id);
    setReservations(stored);
    setHasInitialized(true);
  }, [profile?.id, hasInitialized]);

  const showSkeleton = !hasLoaded || (isLoading && !profile);

  const todayKey = toLocalDateKey(new Date());
  const nowMinutes = parseTimeToMinutes(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) ?? 0;

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

  const handleFormChange = (
    field: keyof typeof form,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleScrollToForm = () => {
    if (!formRef.current) return;
    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveReservation = () => {
    if (!profile?.id) return;
    if (!form.serviceName || !form.clientName || !form.date || !form.time) {
      setSaveMessage('Completá servicio, cliente, fecha y hora.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const newReservation: ProfessionalReservation = {
      id: `reservation-${Date.now()}`,
      serviceName: form.serviceName,
      clientName: form.clientName,
      date: form.date,
      time: form.time,
      price: form.price,
      duration: form.duration,
      status: form.status,
      notes: form.notes,
    };

    const nextReservations = [newReservation, ...reservations];
    try {
      saveProfessionalReservations(profile.id, nextReservations);
      setReservations(nextReservations);
      setForm({
        serviceName: '',
        clientName: '',
        date: '',
        time: '',
        price: '',
        duration: '',
        status: 'confirmed',
        notes: '',
      });
      setSaveMessage('Reserva creada correctamente.');
    } catch {
      setSaveMessage('No se pudo guardar la reserva.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderReservationCard = (reservation: ProfessionalReservation) => (
    <div
      key={reservation.id}
      className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#0E2A47]">{reservation.serviceName}</p>
          <p className="text-xs text-[#64748B]">
            {reservation.clientName} · {reservation.date} · {reservation.time}
          </p>
          {reservation.duration ? (
            <p className="text-xs text-[#64748B]">Duración: {reservation.duration}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[reservation.status || 'confirmed']}`}
          >
            {statusLabel[reservation.status || 'confirmed']}
          </span>
          {reservation.price ? (
            <span className="text-sm font-semibold text-[#1FB6A6]">
              {reservation.price.includes('$') ? reservation.price : `$${reservation.price}`}
            </span>
          ) : null}
        </div>
      </div>
      {reservation.notes ? (
        <p className="mt-2 text-xs text-[#64748B]">{reservation.notes}</p>
      ) : null}
    </div>
  );

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
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                        Reservas
                      </p>
                      <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                        Gestión de reservas
                      </h1>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Consultá tus turnos y cargá reservas manuales.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleScrollToForm}
                      className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Crear reserva
                    </button>
                  </div>
                  {saveMessage ? (
                    <p className="mt-3 text-sm text-[#1FB6A6]">{saveMessage}</p>
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
                  <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
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

                    <div className="space-y-6">
                      <div
                        ref={formRef}
                        id="nueva-reserva"
                        className="scroll-mt-24 rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                      >
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                          Crear reserva manual
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                          Nueva reserva
                        </h2>
                        <div className="mt-4 grid gap-4">
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Servicio
                            </label>
                            <input
                              className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                              value={form.serviceName}
                              onChange={(event) =>
                                handleFormChange('serviceName', event.target.value)
                              }
                              placeholder="Ej: Corte + styling"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Cliente
                            </label>
                            <input
                              className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                              value={form.clientName}
                              onChange={(event) =>
                                handleFormChange('clientName', event.target.value)
                              }
                              placeholder="Ej: Sofía Pérez"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Fecha
                              </label>
                              <input
                                type="date"
                                className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                                value={form.date}
                                onChange={(event) =>
                                  handleFormChange('date', event.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Hora
                              </label>
                              <input
                                type="time"
                                className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                                value={form.time}
                                onChange={(event) =>
                                  handleFormChange('time', event.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Precio
                              </label>
                              <input
                                className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                                value={form.price}
                                onChange={(event) =>
                                  handleFormChange('price', event.target.value)
                                }
                                placeholder="Ej: $9.500"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-[#0E2A47]">
                                Duración
                              </label>
                              <input
                                className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                                value={form.duration}
                                onChange={(event) =>
                                  handleFormChange('duration', event.target.value)
                                }
                                placeholder="Ej: 45 min"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Estado
                            </label>
                            <select
                              className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                              value={form.status}
                              onChange={(event) =>
                                handleFormChange('status', event.target.value)
                              }
                            >
                              <option value="confirmed">Confirmada</option>
                              <option value="pending">Pendiente</option>
                              <option value="completed">Completada</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-[#0E2A47]">
                              Nota
                            </label>
                            <textarea
                              className="h-24 w-full resize-none rounded-[14px] border border-[#E2E7EC] bg-white px-3 py-2 text-sm text-[#0E2A47]"
                              value={form.notes}
                              onChange={(event) =>
                                handleFormChange('notes', event.target.value)
                              }
                              placeholder="Comentarios adicionales."
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveReservation}
                          className="mt-4 w-full rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          Guardar reserva
                        </button>
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
