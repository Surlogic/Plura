'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import {
  loadProfessionalReservations,
  saveProfessionalReservations,
} from '@/lib/professionalReservations';
import type {
  ProfessionalReservation,
  ProfessionalSchedule,
  WorkDayKey,
  WorkShift,
} from '@/types/professional';

const dayLabelsShort: Record<WorkDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
};

const dayKeyByIndex: Record<number, WorkDayKey> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

const weekOrder: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const weekIndexByDay: Record<WorkDayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const DAYS_AHEAD = 28;

const exampleSchedule: ProfessionalSchedule = {
  days: [
    {
      day: 'mon',
      enabled: true,
      paused: false,
      ranges: [
        { id: 'mon-1', start: '09:00', end: '12:00' },
        { id: 'mon-2', start: '14:00', end: '19:00' },
      ],
    },
    {
      day: 'tue',
      enabled: true,
      paused: false,
      ranges: [
        { id: 'tue-1', start: '09:00', end: '12:00' },
        { id: 'tue-2', start: '14:00', end: '19:00' },
      ],
    },
    {
      day: 'wed',
      enabled: true,
      paused: false,
      ranges: [
        { id: 'wed-1', start: '09:00', end: '12:00' },
        { id: 'wed-2', start: '14:00', end: '19:00' },
      ],
    },
    {
      day: 'thu',
      enabled: true,
      paused: false,
      ranges: [
        { id: 'thu-1', start: '09:00', end: '12:00' },
        { id: 'thu-2', start: '14:00', end: '19:00' },
      ],
    },
    {
      day: 'fri',
      enabled: true,
      paused: false,
      ranges: [
        { id: 'fri-1', start: '09:00', end: '12:00' },
        { id: 'fri-2', start: '14:00', end: '19:00' },
      ],
    },
    {
      day: 'sat',
      enabled: true,
      paused: false,
      ranges: [{ id: 'sat-1', start: '09:00', end: '13:00' }],
    },
    {
      day: 'sun',
      enabled: false,
      paused: false,
      ranges: [],
    },
  ],
  pauses: [],
};

const parseDurationToMinutes = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const numbers = trimmed.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  if (trimmed.includes('h')) {
    const hours = numbers[0] ?? 0;
    const minutes = numbers.length > 1 ? numbers[1] : 0;
    return hours * 60 + minutes;
  }
  return numbers[0];
};

const formatDuration = (value?: string) => {
  const minutes = parseDurationToMinutes(value);
  if (!minutes) return 'Duración estimada 45 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} h`;
  return `${hours} h ${remaining} min`;
};

const formatPrice = (value?: string) => {
  if (!value) return 'A confirmar';
  const trimmed = value.trim();
  if (!trimmed) return 'A confirmar';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}`;
};

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const buildSlotsForDay = (ranges: WorkShift[], durationMinutes: number) => {
  const slots: string[] = [];
  ranges.forEach((range) => {
    const start = parseTime(range.start);
    const end = parseTime(range.end);
    if (start === null || end === null) return;
    let current = start;
    while (current + durationMinutes <= end) {
      slots.push(formatTime(current));
      current += durationMinutes;
    }
  });
  return slots;
};

const isDatePaused = (
  dateKey: string,
  pauses: ProfessionalSchedule['pauses'],
) => {
  return pauses.some((pause) => {
    if (!pause.startDate) return false;
    const start = pause.startDate;
    const end = pause.endDate || pause.startDate;
    return dateKey >= start && dateKey <= end;
  });
};

type ReservationContext = {
  service?: {
    name?: string;
    price?: string;
    duration?: string;
    paymentType?: string;
    photos?: string[];
  };
  schedule?: ProfessionalSchedule | null;
  professional?: {
    name?: string;
    slug?: string;
    id?: string;
  };
};

export default function ReservationPage() {
  const router = useRouter();
  const [context, setContext] = useState<ReservationContext | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<WorkDayKey>('mon');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('plura:reservationContext');
    if (stored) {
      try {
        setContext(JSON.parse(stored));
      } catch {
        setContext(null);
      }
    }
  }, []);

  const queryServiceName =
    typeof router.query.servicio === 'string' ? router.query.servicio : '';
  const queryPrice =
    typeof router.query.precio === 'string' ? router.query.precio : '';
  const queryDuration =
    typeof router.query.duracion === 'string' ? router.query.duracion : '';

  const service = useMemo(
    () => ({
      name: queryServiceName || context?.service?.name || 'Servicio seleccionado',
      price: queryPrice || context?.service?.price || '',
      duration: queryDuration || context?.service?.duration || '',
      paymentType: context?.service?.paymentType,
    }),
    [queryDuration, queryPrice, queryServiceName, context],
  );

  const schedule = useMemo(() => {
    if (context?.schedule && context.schedule.days.length > 0) {
      return context.schedule;
    }
    return exampleSchedule;
  }, [context?.schedule]);

  const calendarDays = useMemo(() => {
    const result: Array<{
      date: Date;
      dateKey: string;
      dayKey: WorkDayKey;
      available: boolean;
    }> = [];
    const today = new Date();
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayKey = dayKeyByIndex[date.getDay()];
      const daySchedule = schedule.days.find((day) => day.day === dayKey);
      const dateKey = toLocalDateKey(date);
      const available = Boolean(
        daySchedule &&
          daySchedule.enabled &&
          !daySchedule.paused &&
          daySchedule.ranges.length > 0 &&
          !isDatePaused(dateKey, schedule.pauses),
      );
      result.push({ date, dateKey, dayKey, available });
    }
    return result;
  }, [schedule]);

  const availableDates = useMemo(
    () => calendarDays.filter((day) => day.available),
    [calendarDays],
  );

  useEffect(() => {
    if (availableDates.length === 0) return;
    const firstDate = availableDates[0];
    if (!selectedDate || !availableDates.some((item) => item.dateKey === selectedDate)) {
      setSelectedDate(firstDate.dateKey);
      setSelectedDayKey(firstDate.dayKey);
      setSelectedTime(null);
    }
  }, [availableDates, selectedDate]);

  const durationMinutes = parseDurationToMinutes(service.duration) || 45;
  const selectedRanges =
    schedule.days.find((day) => day.day === selectedDayKey)?.ranges ?? [];
  const slots = useMemo(() => {
    const baseSlots = buildSlotsForDay(selectedRanges, durationMinutes);
    if (!selectedDate) return baseSlots;
    const todayKey = toLocalDateKey(new Date());
    if (selectedDate !== todayKey) return baseSlots;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return baseSlots.filter((slot) => {
      const minutes = parseTime(slot);
      return minutes !== null && minutes >= nowMinutes;
    });
  }, [selectedRanges, durationMinutes, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return 'Seleccioná un día';
    const date = calendarDays.find((item) => item.dateKey === selectedDate)?.date;
    if (!date) return 'Seleccioná un día';
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [calendarDays, selectedDate]);

  const calendarTitle = useMemo(() => {
    if (calendarDays.length === 0) return '';
    const first = calendarDays[0].date;
    const last = calendarDays[calendarDays.length - 1].date;
    const firstLabel = first.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    const lastLabel = last.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    });
    return firstLabel === lastLabel
      ? firstLabel
      : `${firstLabel} · ${lastLabel}`;
  }, [calendarDays]);

  const calendarCells = useMemo(() => {
    if (calendarDays.length === 0) return [];
    const firstDayKey = calendarDays[0].dayKey;
    const leadingEmpty = weekIndexByDay[firstDayKey];
    const emptyCells = Array.from({ length: leadingEmpty }).map((_, index) => ({
      key: `empty-${index}`,
      empty: true,
    }));
    return [
      ...emptyCells,
      ...calendarDays.map((day) => ({ ...day, key: day.dateKey, empty: false })),
    ];
  }, [calendarDays]);

  const handleClientChange = (
    field: keyof typeof client,
    value: string,
  ) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  };


  const buildNotes = () => {
    const note = client.notes.trim();
    const email = client.email.trim();
    const phone = client.phone.trim();
    const contact = [email, phone].filter(Boolean).join(' / ');
    if (!note && !contact) return '';
    if (!note) return `Contacto: ${contact}`;
    if (!contact) return note;
    return `${note} | Contacto: ${contact}`;
  };

  const handleConfirm = () => {
    if (!selectedDate) {
      setSaveError('Seleccioná un día para continuar.');
      setSaveMessage(null);
      return;
    }
    if (!selectedTime) {
      setSaveError('Seleccioná un horario para continuar.');
      setSaveMessage(null);
      return;
    }

    const professionalId = context?.professional?.id;
    if (!professionalId) {
      setSaveError(
        'No pudimos identificar al profesional para guardar la reserva.',
      );
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const newReservation: ProfessionalReservation = {
      id: `reservation-${Date.now()}`,
      serviceName: service.name || 'Servicio',
      clientName: client.name.trim() || 'Cliente sin nombre',
      date: selectedDate,
      time: selectedTime,
      price: service.price?.trim() || '',
      duration: service.duration?.trim() || '',
      status: 'confirmed',
      notes: buildNotes(),
    };

    try {
      const current = loadProfessionalReservations(professionalId);
      const nextReservations = [newReservation, ...current];
      saveProfessionalReservations(professionalId, nextReservations);
      setSaveMessage('Reserva confirmada y agregada a tus reservas.');
      setSelectedTime(null);
    } catch {
      setSaveError('No se pudo guardar la reserva.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pb-24 pt-10">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
            Reserva
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
            Reservá tu turno
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Seleccioná un horario disponible y completá tus datos.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                Servicio
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                {service.name}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                    Duración
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                    {formatDuration(service.duration)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                    Precio
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#1FB6A6]">
                    {formatPrice(service.price)}
                  </p>
                </div>
              </div>
              {service.paymentType ? (
                <p className="mt-3 text-xs text-[#64748B]">
                  Forma de pago:{' '}
                  {service.paymentType === 'full'
                    ? 'Pago completo'
                    : service.paymentType === 'deposit'
                      ? 'Solo seña'
                      : 'Paga en el local'}
                </p>
              ) : (
                <p className="mt-3 text-xs text-[#64748B]">
                  Si falta información, la confirmaremos por mensaje.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                Datos
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                Tus datos
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">
                    Nombre
                  </label>
                  <input
                    className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                    value={client.name}
                    onChange={(event) =>
                      handleClientChange('name', event.target.value)
                    }
                    placeholder="Ej: Sofía Pérez"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2A47]">
                    Teléfono
                  </label>
                  <input
                    className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                    value={client.phone}
                    onChange={(event) =>
                      handleClientChange('phone', event.target.value)
                    }
                    placeholder="Ej: +54 11 5555 4444"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#0E2A47]">
                    Email
                  </label>
                  <input
                    className="h-11 w-full rounded-[14px] border border-[#E2E7EC] bg-white px-3 text-sm text-[#0E2A47]"
                    value={client.email}
                    onChange={(event) =>
                      handleClientChange('email', event.target.value)
                    }
                    placeholder="Ej: hola@email.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[#0E2A47]">
                    Nota
                  </label>
                  <textarea
                    className="h-24 w-full resize-none rounded-[14px] border border-[#E2E7EC] bg-white px-3 py-2 text-sm text-[#0E2A47]"
                    value={client.notes}
                    onChange={(event) =>
                      handleClientChange('notes', event.target.value)
                    }
                    placeholder="Comentarios adicionales para el profesional."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                Turnos
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                Elegí un horario
              </h2>
              <p className="mt-2 text-xs text-[#64748B]">
                Turnos sugeridos según el horario cargado.
              </p>
              {availableDates.length === 0 ? (
                <div className="mt-4 rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                  No hay días habilitados en las próximas semanas.
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
                      Calendario
                    </p>
                    <span className="text-xs font-semibold text-[#64748B]">
                      {calendarTitle}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[0.65rem] font-semibold text-[#94A3B8]">
                    {weekOrder.map((day) => (
                      <div key={day}>{dayLabelsShort[day]}</div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {calendarCells.map((cell) => {
                      if (cell.empty) {
                        return <div key={cell.key} className="h-12" />;
                      }
                      const dayNumber = String(cell.date.getDate()).padStart(2, '0');
                      const monthLabel = cell.date.toLocaleDateString('es-AR', {
                        month: 'short',
                      });
                      const isSelected = selectedDate === cell.dateKey;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          disabled={!cell.available}
                          onClick={() => {
                            if (!cell.available) return;
                            setSelectedDate(cell.dateKey);
                            setSelectedDayKey(cell.dayKey);
                            setSelectedTime(null);
                          }}
                          className={`flex h-12 flex-col items-center justify-center rounded-[14px] border text-xs font-semibold transition ${
                            cell.available
                              ? isSelected
                                ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                                : 'border-[#E2E7EC] bg-[#F8FAFC] text-[#0E2A47] hover:-translate-y-0.5'
                              : 'cursor-not-allowed border-[#E2E7EC] bg-[#F1F5F9] text-[#CBD5F5]'
                          }`}
                        >
                          <span>{dayNumber}</span>
                          <span className="text-[0.6rem] uppercase text-[#94A3B8]">
                            {monthLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm text-[#0E2A47]">
                <span className="font-semibold capitalize">{selectedDateLabel}</span>
                <span className="ml-2 text-xs text-[#64748B]">
                  {formatDuration(service.duration)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {slots.length === 0 ? (
                  <div className="col-span-full rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                    No hay turnos disponibles en este día.
                  </div>
                ) : (
                  slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`rounded-[14px] border px-3 py-2 text-sm font-semibold transition ${
                        selectedTime === slot
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

            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                Confirmación
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                Revisá tu reserva
              </h2>
              <div className="mt-4 space-y-2 text-sm text-[#64748B]">
                <p>
                  Servicio: <span className="font-semibold text-[#0E2A47]">{service.name}</span>
                </p>
                <p>
                  Día: <span className="font-semibold text-[#0E2A47] capitalize">{selectedDateLabel}</span>
                </p>
                <p>
                  Hora:{' '}
                  <span className="font-semibold text-[#0E2A47]">
                    {selectedTime || 'Sin seleccionar'}
                  </span>
                </p>
                <p>
                  Precio: <span className="font-semibold text-[#0E2A47]">{formatPrice(service.price)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedTime || isSaving}
                className={`mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  selectedTime && !isSaving
                    ? 'bg-[#0B1D2A] text-white hover:-translate-y-0.5 hover:shadow-md'
                    : 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isSaving ? 'Guardando...' : 'Confirmar reserva'}
              </button>
              {saveMessage ? (
                <p className="mt-3 text-xs font-semibold text-[#1FB6A6]">
                  {saveMessage}
                </p>
              ) : null}
              {saveError ? (
                <p className="mt-3 text-xs font-semibold text-[#EF4444]">
                  {saveError}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-[#94A3B8]">
                La reserva se guarda de forma local para pruebas.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
