'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [selectedReservation, setSelectedReservation] =
    useState<ProfessionalReservation | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'form' | 'detail' | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(
    null,
  );
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
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

  useEffect(() => {
    if (activeDrawer) {
      const frame = requestAnimationFrame(() => setDrawerVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setDrawerVisible(false);
    return undefined;
  }, [activeDrawer]);

  const closeDrawer = () => {
    setDrawerVisible(false);
    window.setTimeout(() => {
      setActiveDrawer(null);
      setSelectedReservation(null);
    }, 200);
  };

  const openCreateDrawer = () => {
    setFormMode('create');
    setEditingReservationId(null);
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
    setActiveDrawer('form');
  };

  const openDetailDrawer = (reservation: ProfessionalReservation) => {
    setSelectedReservation(reservation);
    setActiveDrawer('detail');
  };

  const openEditDrawer = (reservation: ProfessionalReservation) => {
    setFormMode('edit');
    setEditingReservationId(reservation.id);
    setForm({
      serviceName: reservation.serviceName,
      clientName: reservation.clientName,
      date: reservation.date,
      time: reservation.time,
      price: reservation.price ?? '',
      duration: reservation.duration ?? '',
      status: reservation.status ?? 'confirmed',
      notes: reservation.notes ?? '',
    });
    setActiveDrawer('form');
  };

  const handleUpdateStatus = (status: ReservationStatus) => {
    if (!selectedReservation || !profile?.id) return;
    const nextReservations = reservations.map((reservation) =>
      reservation.id === selectedReservation.id ? { ...reservation, status } : reservation,
    );
    setReservations(nextReservations);
    saveProfessionalReservations(profile.id, nextReservations);
    setSelectedReservation((prev) => (prev ? { ...prev, status } : prev));
  };

  const handleSaveReservation = () => {
    if (!profile?.id) return;
    if (!form.serviceName || !form.clientName || !form.date || !form.time) {
      setSaveMessage('Completá servicio, cliente, fecha y hora.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const payload: ProfessionalReservation = {
      id: editingReservationId ?? `reservation-${Date.now()}`,
      serviceName: form.serviceName,
      clientName: form.clientName,
      date: form.date,
      time: form.time,
      price: form.price,
      duration: form.duration,
      status: form.status,
      notes: form.notes,
    };

    const nextReservations =
      formMode === 'edit' && editingReservationId
        ? reservations.map((reservation) =>
            reservation.id === editingReservationId ? payload : reservation,
          )
        : [payload, ...reservations];
    try {
      saveProfessionalReservations(profile.id, nextReservations);
      setReservations(nextReservations);
      if (formMode === 'edit') {
        setSaveMessage('Reserva actualizada correctamente.');
      } else {
        setSaveMessage('Reserva creada correctamente.');
      }
      closeDrawer();
    } catch {
      setSaveMessage('No se pudo guardar la reserva.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderReservationCard = (reservation: ProfessionalReservation) => (
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
          className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusStyles[reservation.status || 'confirmed']}`}
        >
          {statusLabel[reservation.status || 'confirmed']}
        </span>
        {reservation.price ? (
          <span className="text-sm font-semibold text-[#1FB6A6]">
            {reservation.price.includes('$') ? reservation.price : `$${reservation.price}`}
          </span>
        ) : null}
      </div>
    </button>
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
                      onClick={openCreateDrawer}
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
      {activeDrawer ? (
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
            {activeDrawer === 'detail' && selectedReservation ? (
              <>
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
                      statusStyles[selectedReservation.status || 'confirmed']
                    }`}
                  >
                    {statusLabel[selectedReservation.status || 'confirmed']}
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
                      Duración
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {selectedReservation.duration || 'Sin definir'}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                        Email
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">Sin dato</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                        Teléfono
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">Sin dato</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('confirmed')}
                    className="rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('cancelled')}
                    className="rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditDrawer(selectedReservation)}
                    className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Editar
                  </button>
                </div>
              </>
            ) : null}

            {activeDrawer === 'form' ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                      {formMode === 'edit' ? 'Editar reserva' : 'Nueva reserva'}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                      {formMode === 'edit' ? 'Editar reserva' : 'Crear reserva'}
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

                <div className="mt-6 grid gap-4">
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
                  className="mt-6 w-full rounded-full bg-[#1FB6A6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  disabled={isSaving}
                >
                  {formMode === 'edit' ? 'Guardar cambios' : 'Guardar reserva'}
                </button>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
