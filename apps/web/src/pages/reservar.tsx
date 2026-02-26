'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import {
  createPublicReservation,
  getPublicProfessionalBySlug,
  getPublicSlots,
  type PublicBookingStatus,
  type PublicProfessionalPage,
  type PublicProfessionalService,
} from '@/services/publicBookings';
import type { WorkDayKey } from '@/types/professional';

const dayLabelsShort: Record<WorkDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mie',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sab',
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
const DAYS_AHEAD = 28;

const bookingStatusLabel: Record<PublicBookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
};

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

const resolveQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
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
  if (!minutes) return 'Duracion estimada 45 min';
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

type ReservationConfirmation = {
  status: PublicBookingStatus;
  professionalName: string;
  serviceName: string;
  date: string;
  time: string;
};

const extractApiMessage = (_error: unknown, fallback: string) => fallback;

export default function ReservationPage() {
  const router = useRouter();
  const [professional, setProfessional] = useState<PublicProfessionalPage | null>(null);
  const [service, setService] = useState<PublicProfessionalService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(null);

  const professionalSlug = resolveQueryValue(router.query.profesional).trim();
  const serviceId =
    resolveQueryValue(router.query.serviceId).trim() ||
    resolveQueryValue(router.query.servicioId).trim();
  const serviceNameQuery = resolveQueryValue(router.query.servicio).trim();

  const calendarDays = useMemo(() => {
    const result: Array<{
      date: Date;
      dateKey: string;
      dayKey: WorkDayKey;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push({
        date,
        dateKey: toLocalDateKey(date),
        dayKey: dayKeyByIndex[date.getDay()],
      });
    }

    return result;
  }, []);

  useEffect(() => {
    if (!selectedDate && calendarDays.length > 0) {
      setSelectedDate(calendarDays[0].dateKey);
    }
  }, [calendarDays, selectedDate]);

  const calendarCells = useMemo(() => {
    if (calendarDays.length === 0) return [];
    const firstDayKey = calendarDays[0].dayKey;
    const leadingEmpty = weekOrder.indexOf(firstDayKey);
    const emptyCells = Array.from({ length: Math.max(leadingEmpty, 0) }).map((_, index) => ({
      key: `empty-${index}`,
      empty: true as const,
    }));

    return [
      ...emptyCells,
      ...calendarDays.map((day) => ({
        ...day,
        key: day.dateKey,
        empty: false as const,
      })),
    ];
  }, [calendarDays]);

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
    return firstLabel === lastLabel ? firstLabel : `${firstLabel} · ${lastLabel}`;
  }, [calendarDays]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return 'Selecciona un dia';
    const date = calendarDays.find((item) => item.dateKey === selectedDate)?.date;
    if (!date) return 'Selecciona un dia';
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [calendarDays, selectedDate]);

  useEffect(() => {
    if (!router.isReady) return;

    setContextError(null);
    setSaveError(null);
    setSaveMessage(null);
    setConfirmation(null);

    if (!professionalSlug) {
      setProfessional(null);
      setService(null);
      setContextError('Falta el slug del profesional para reservar.');
      return;
    }

    setIsLoadingContext(true);
    getPublicProfessionalBySlug(professionalSlug)
      .then((response) => {
        setProfessional(response);

        const byId = serviceId
          ? response.services.find((item) => item.id === serviceId)
          : undefined;
        const byName = !byId && serviceNameQuery
          ? response.services.find(
              (item) => item.name.trim().toLowerCase() === serviceNameQuery.toLowerCase(),
            )
          : undefined;
        const resolvedService = byId ?? byName ?? null;

        if (!resolvedService) {
          setService(null);
          setContextError('No se encontro el servicio seleccionado. Volve a la pagina del profesional.');
          return;
        }

        setService(resolvedService);
      })
      .catch((error) => {
        setProfessional(null);
        setService(null);
        setContextError(
          extractApiMessage(error, 'No se pudo cargar la informacion del profesional.'),
        );
      })
      .finally(() => {
        setIsLoadingContext(false);
      });
  }, [professionalSlug, router.isReady, serviceId, serviceNameQuery]);

  useEffect(() => {
    if (!professionalSlug || !service?.id || !selectedDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSlots(true);

    getPublicSlots(professionalSlug, selectedDate, service.id)
      .then((response) => {
        if (isCancelled) return;
        setSlots(response);
        setSelectedTime((current) =>
          current && response.includes(current) ? current : null,
        );
      })
      .catch((error) => {
        if (isCancelled) return;
        setSlots([]);
        setSaveError(
          extractApiMessage(error, 'No se pudieron cargar los horarios disponibles.'),
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [professionalSlug, selectedDate, service?.id]);

  useEffect(() => {
    if (!confirmation) return;

    const timeoutId = window.setTimeout(() => {
      router.push('/cliente/dashboard');
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [confirmation, router]);

  const handleConfirm = async () => {
    if (!professionalSlug || !service?.id || !selectedDate || !selectedTime) {
      setSaveMessage(null);
      setSaveError('Completa profesional, servicio, fecha y hora para reservar.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const created = await createPublicReservation(professionalSlug, {
        serviceId: service.id,
        startDateTime: `${selectedDate}T${selectedTime}`,
      });

      setConfirmation({
        status: created.status,
        professionalName: professional?.fullName || 'Profesional',
        serviceName: service.name,
        date: selectedDate,
        time: selectedTime,
      });
      setSaveMessage('Reserva creada. Redirigiendo al dashboard cliente...');
      setSelectedTime(null);

      const refreshedSlots = await getPublicSlots(professionalSlug, selectedDate, service.id);
      setSlots(refreshedSlots);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setSaveError('Ese horario ya esta reservado. Elegi otro.');
      } else if (isAxiosError(error) && error.response?.status === 401) {
        setSaveError('Necesitas iniciar sesion como cliente para reservar.');
        router.push('/cliente/auth/login');
      } else {
        setSaveError(extractApiMessage(error, 'No se pudo crear la reserva.'));
      }
      setSaveMessage(null);
      setConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Reserva</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">Reserva tu turno</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Selecciona un horario real disponible y confirma la reserva.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Profesional</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                {professional?.fullName || 'Cargando profesional...'}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {professional?.location || 'Ubicacion a confirmar'}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Servicio</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">
                {service?.name || 'Servicio no seleccionado'}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Duracion</p>
                  <p className="mt-2 text-sm font-semibold text-[#0E2A47]">
                    {formatDuration(service?.duration)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">Precio</p>
                  <p className="mt-2 text-sm font-semibold text-[#1FB6A6]">
                    {formatPrice(service?.price)}
                  </p>
                </div>
              </div>
            </div>

            {contextError ? (
              <div className="rounded-[18px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626]">
                {contextError}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Turnos</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">Elegi un horario</h2>


              <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">Calendario</p>
                  <span className="text-xs font-semibold text-[#64748B]">{calendarTitle}</span>
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
                        onClick={() => {
                          setSelectedDate(cell.dateKey);
                          setSelectedTime(null);
                        }}
                        className={`flex h-12 flex-col items-center justify-center rounded-[14px] border text-xs font-semibold transition ${
                          isSelected
                            ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                            : 'border-[#E2E7EC] bg-[#F8FAFC] text-[#0E2A47] hover:-translate-y-0.5'
                        }`}
                      >
                        <span>{dayNumber}</span>
                        <span className="text-[0.6rem] uppercase text-[#94A3B8]">{monthLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm text-[#0E2A47]">
                <span className="font-semibold capitalize">{selectedDateLabel}</span>
                <span className="ml-2 text-xs text-[#64748B]">{formatDuration(service?.duration)}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {isLoadingSlots ? (
                  <div className="col-span-full rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                    Cargando horarios disponibles...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="col-span-full rounded-[16px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                    No hay turnos disponibles para este dia.
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
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Confirmacion</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">Revisa tu reserva</h2>
              <div className="mt-4 space-y-2 text-sm text-[#64748B]">
                <p>
                  Profesional:{' '}
                  <span className="font-semibold text-[#0E2A47]">
                    {professional?.fullName || 'Sin seleccionar'}
                  </span>
                </p>
                <p>
                  Servicio:{' '}
                  <span className="font-semibold text-[#0E2A47]">{service?.name || 'Sin seleccionar'}</span>
                </p>
                <p>
                  Dia:{' '}
                  <span className="font-semibold text-[#0E2A47] capitalize">{selectedDateLabel}</span>
                </p>
                <p>
                  Hora:{' '}
                  <span className="font-semibold text-[#0E2A47]">{selectedTime || 'Sin seleccionar'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedTime || isSaving || isLoadingContext || !service?.id}
                className={`mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  selectedTime && !isSaving && !isLoadingContext && service?.id
                    ? 'bg-[#0B1D2A] text-white hover:-translate-y-0.5 hover:shadow-md'
                    : 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isSaving ? 'Creando reserva...' : 'Confirmar reserva'}
              </button>

              {saveMessage ? (
                <p className="mt-3 text-xs font-semibold text-[#1FB6A6]">{saveMessage}</p>
              ) : null}
              {saveError ? (
                <p className="mt-3 text-xs font-semibold text-[#EF4444]">{saveError}</p>
              ) : null}

              {confirmation ? (
                <div className="mt-4 rounded-[16px] border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm text-[#14532D]">
                  <p className="font-semibold">Reserva creada</p>
                  <p className="mt-1">Profesional: {confirmation.professionalName}</p>
                  <p>Servicio: {confirmation.serviceName}</p>
                  <p>
                    Fecha y hora: {confirmation.date} {confirmation.time}
                  </p>
                  <p>Estado: {bookingStatusLabel[confirmation.status]}</p>
                  <button
                    type="button"
                    onClick={() => router.push('/cliente/dashboard')}
                    className="mt-3 rounded-full border border-[#14532D] px-3 py-1 text-xs font-semibold text-[#14532D]"
                  >
                    Ir al dashboard cliente
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
