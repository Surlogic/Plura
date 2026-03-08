'use client';

import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import {
  createPublicReservation,
  getPublicProfessionalBySlug,
  getPublicSlots,
  type PublicProfessionalPage,
  type PublicProfessionalService,
} from '@/services/publicBookings';
import { createClientBookingPaymentSession } from '@/services/clientBookings';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import {
  clearPendingReservation,
  getPendingReservation,
  savePendingReservation,
} from '@/services/pendingReservation';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { getPaymentTypeDescription, getPaymentTypeLabel, isPrepaidBooking } from '@/utils/bookings';
import type { WorkDayKey } from '@/types/professional';

const PublicProfileMap = dynamic(
  () => import('@/components/profesional/PublicProfileMap'),
  { ssr: false },
);

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

const RESERVATION_ERROR_FALLBACK = 'No se pudo crear la reserva. Intenta nuevamente.';
const RESERVATION_TIMEOUT_ERROR =
  'La solicitud tardó demasiado. Intenta nuevamente.';
const RESERVATION_LOGIN_REDIRECT = '/login?redirect=confirm-reservation';

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

const splitLocationLines = (location: string) => {
  const normalized = location.trim();
  if (!normalized) {
    return { addressLine: '', cityLine: '' };
  }
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { addressLine: '', cityLine: '' };
  }
  if (parts.length === 1) {
    return { addressLine: parts[0], cityLine: '' };
  }
  return {
    addressLine: parts[0],
    cityLine: parts.slice(1).join(', '),
  };
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return fallback;
    }
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData.trim();
    }
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
      const errorMessage = (responseData as { error?: unknown }).error;
      if (typeof errorMessage === 'string' && errorMessage.trim()) {
        return errorMessage.trim();
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

const isReservationTimeoutError = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  if (error.code === 'ECONNABORTED') return true;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('timeout') || message.includes('timed out');
};

export default function ReservationPage() {
  const router = useRouter();
  const { profile: clientProfile, hasLoaded: clientHasLoaded, isLoading: clientLoading } =
    useClientProfileContext();
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
  const [hasAppliedPendingSelection, setHasAppliedPendingSelection] = useState(false);

  const professionalSlug = resolveQueryValue(router.query.profesional).trim();
  const serviceId =
    resolveQueryValue(router.query.serviceId).trim() ||
    resolveQueryValue(router.query.servicioId).trim();
  const serviceNameQuery = resolveQueryValue(router.query.servicio).trim();
  const dateQuery = resolveQueryValue(router.query.date).trim();
  const timeQuery = resolveQueryValue(router.query.time).trim();
  const resumeQuery = resolveQueryValue(router.query.resume).trim();

  const todayKey = toLocalDateKey(new Date());

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  useEffect(() => {
    if (!selectedDate && calendarDays.length > 0) {
      setSelectedDate(calendarDays[0].dateKey);
    }
  }, [calendarDays, selectedDate]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!dateQuery && !timeQuery) return;

    if (dateQuery && calendarDays.some((item) => item.dateKey === dateQuery)) {
      setSelectedDate(dateQuery);
    }
    if (timeQuery) {
      setSelectedTime(timeQuery);
    }
  }, [calendarDays, dateQuery, router.isReady, timeQuery]);

  useEffect(() => {
    if (resumeQuery !== '1') return;
    setSaveError('Retomá la reserva y confirmá para abrir el checkout real.');
  }, [resumeQuery]);

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
    if (hasAppliedPendingSelection) return;
    if (!professionalSlug || !service?.id) return;
    if (calendarDays.length === 0) return;

    const pendingReservation = getPendingReservation();
    if (
      !pendingReservation
      || pendingReservation.professionalSlug !== professionalSlug
      || pendingReservation.serviceId !== service.id
    ) {
      setHasAppliedPendingSelection(true);
      return;
    }

    const hasPendingDate = calendarDays.some((item) => item.dateKey === pendingReservation.date);
    if (hasPendingDate) {
      setSelectedDate(pendingReservation.date);
    }
    if (pendingReservation.time) {
      setSelectedTime(pendingReservation.time);
    }
    setHasAppliedPendingSelection(true);
  }, [calendarDays, hasAppliedPendingSelection, professionalSlug, service?.id]);

  const handleConfirm = async () => {
    if (!professionalSlug || !service?.id || !selectedDate || !selectedTime) {
      setSaveMessage(null);
      setSaveError('Completa profesional, servicio, fecha y hora para reservar.');
      return;
    }

    if (!clientHasLoaded || clientLoading) {
      setSaveMessage(null);
      setSaveError('Estamos verificando tu sesión. Intenta nuevamente.');
      return;
    }

    if (!clientProfile) {
      savePendingReservation({
        professionalSlug,
        serviceId: service.id,
        date: selectedDate,
        time: selectedTime,
        professionalName: professional?.fullName || undefined,
        serviceName: service.name,
      });
      router.push(RESERVATION_LOGIN_REDIRECT);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const requiresCheckout = isPrepaidBooking(service.paymentType);
    const checkoutWindow = requiresCheckout && typeof window !== 'undefined'
      ? window.open('', '_blank', 'noopener,noreferrer')
      : null;

    if (checkoutWindow) {
      checkoutWindow.document.write(
        '<p style="font-family:sans-serif;padding:24px">Preparando checkout seguro...</p>',
      );
    }

    try {
      const payload = {
        serviceId: service.id,
        startDateTime: `${selectedDate}T${selectedTime}`,
      };

      const created = await createPublicReservation(professionalSlug, payload);
      if (!created || typeof created.id !== 'number') {
        throw new Error(RESERVATION_ERROR_FALLBACK);
      }

      clearPendingReservation();
      if (requiresCheckout) {
        const paymentSession = await createClientBookingPaymentSession(String(created.id));
        const hasCheckoutUrl = Boolean(paymentSession.checkoutUrl);

        if (checkoutWindow && paymentSession.checkoutUrl) {
          checkoutWindow.location.href = paymentSession.checkoutUrl;
        } else if (paymentSession.checkoutUrl && typeof window !== 'undefined') {
          window.open(paymentSession.checkoutUrl, '_blank', 'noopener,noreferrer');
        } else if (checkoutWindow) {
          checkoutWindow.close();
        }

        setSaveMessage(
          hasCheckoutUrl
            ? 'Reserva creada. Abrimos el checkout y te dejamos en el estado de la reserva.'
            : 'Reserva creada. El backend ya devolvió el estado actualizado de pago.',
        );
        router.push({
          pathname: '/cliente/reservas',
          query: {
            bookingId: String(created.id),
            checkout: hasCheckoutUrl ? 'started' : 'synced',
          },
        });
        return;
      }

      if (checkoutWindow) {
        checkoutWindow.close();
      }
      setSaveMessage('Reserva creada. Te llevamos al estado de la reserva.');
      router.push({
        pathname: '/cliente/reservas',
        query: {
          bookingId: String(created.id),
          created: '1',
        },
      });
    } catch (error) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }
      if (isReservationTimeoutError(error)) {
        setSaveError(RESERVATION_TIMEOUT_ERROR);
      } else if (isAxiosError(error) && error.response?.status === 409) {
        setSaveError(extractApiMessage(error, 'Ese horario ya esta reservado. Elegi otro.'));
      } else if (isAxiosError(error) && error.response?.status === 401) {
        savePendingReservation({
          professionalSlug,
          serviceId: service.id,
          date: selectedDate,
          time: selectedTime,
          professionalName: professional?.fullName || undefined,
          serviceName: service.name,
        });
        setSaveError('Necesitas iniciar sesion como cliente para reservar.');
        router.push(RESERVATION_LOGIN_REDIRECT);
      } else {
        setSaveError(extractApiMessage(error, RESERVATION_ERROR_FALLBACK));
      }
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const locationText = (professional?.location || '').trim();
  const { addressLine, cityLine } = useMemo(
    () => splitLocationLines(locationText),
    [locationText],
  );
  const mapLatitude = parseOptionalNumber(professional?.latitude);
  const mapLongitude = parseOptionalNumber(professional?.longitude);
  const hasMapCoordinates = mapLatitude !== null && mapLongitude !== null;
  const canRenderReservationMap = Boolean(addressLine) && hasMapCoordinates;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EEF2F6_45%,#D3D7DC_100%)] text-[#0E2A47]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <section className="rounded-[28px] border border-white/70 bg-white/95 px-6 py-5 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Reserva</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#0E2A47]">Reserva tu turno</h1>
          <div className="mt-3 flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border border-[#D9E2EC] bg-white">
              {service?.imageUrl ? (
                <img
                  src={resolveAssetUrl(service.imageUrl)}
                  alt={service?.name || 'Servicio'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                  Sin foto
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm text-[#64748B]">
              <p className="font-semibold text-[#0E2A47]">
                {service?.name || 'Servicio no seleccionado'} · {formatDuration(service?.duration)} ·{' '}
                {formatPrice(service?.price)}
              </p>
              {service?.description ? (
                <p className="text-xs text-[#64748B]">{service.description}</p>
              ) : null}
              <div className="rounded-[14px] border border-[#E2E7EC] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
                  Modalidad de pago
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0E2A47]">
                  {getPaymentTypeLabel(service?.paymentType)}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {getPaymentTypeDescription(service?.paymentType)}
                </p>
              </div>
              <p>{professional?.fullName || 'Cargando profesional...'}</p>
              <p>{professional?.location || 'Ubicacion a confirmar'}</p>
            </div>
          </div>
        </section>

        {contextError ? (
          <div className="mt-4 rounded-[18px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#DC2626]">
            {contextError}
          </div>
        ) : null}

        <section className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Turnos</p>
            <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">Elegi un horario</h2>

            {addressLine ? (
              <div className="mt-4 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
                  Ubicacion
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0E2A47]">{addressLine}</p>
                {cityLine ? <p className="text-xs text-[#64748B]">{cityLine}</p> : null}
                {canRenderReservationMap ? (
                  <div className="mt-3">
                    <PublicProfileMap
                      name={professional?.fullName || 'Profesional'}
                      category={professional?.rubro || 'Servicio'}
                      address={addressLine}
                      city={cityLine}
                      latitude={mapLatitude as number}
                      longitude={mapLongitude as number}
                      heightClassName="h-52"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#94A3B8]">Mapa no disponible para esta direccion.</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 rounded-[16px] border border-[#E2E7EC] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#94A3B8]">
                  Calendario
                </p>
                <span className="text-xs font-semibold capitalize text-[#64748B]">{calendarTitle}</span>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1.5 text-center text-[0.62rem] font-semibold text-[#94A3B8]">
                {weekOrder.map((day) => (
                  <div key={day}>{dayLabelsShort[day]}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {calendarCells.map((cell) => {
                  if (cell.empty) {
                    return <div key={cell.key} className="h-10" />;
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
                      className={`flex h-10 flex-col items-center justify-center rounded-[12px] border text-[0.68rem] font-semibold transition ${
                        isSelected
                          ? 'border-[#1FB6A6] bg-[#1FB6A6]/10 text-[#0E2A47]'
                          : 'border-[#E2E7EC] bg-[#F8FAFC] text-[#0E2A47] hover:-translate-y-0.5'
                      }`}
                    >
                      <span>{dayNumber}</span>
                      <span className="text-[0.55rem] uppercase text-[#94A3B8]">{monthLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 rounded-[14px] border border-[#E2E7EC] bg-[#F7F9FB] px-3 py-2 text-sm text-[#0E2A47]">
              <span className="font-semibold capitalize">{selectedDateLabel}</span>
              <span className="ml-2 text-xs text-[#64748B]">{formatDuration(service?.duration)}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {isLoadingSlots ? (
                <div className="col-span-full rounded-[14px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                  Cargando horarios disponibles...
                </div>
              ) : slots.length === 0 ? (
                <div className="col-span-full rounded-[14px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                  No hay turnos disponibles para este dia.
                </div>
              ) : (
                slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`rounded-[10px] border px-2.5 py-1.5 text-sm font-semibold transition ${
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

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Tu reserva</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0E2A47]">Resumen</h2>
              <div className="mt-3 h-28 w-full overflow-hidden rounded-[14px] border border-[#D9E2EC] bg-white">
                {service?.imageUrl ? (
                  <img
                    src={resolveAssetUrl(service.imageUrl)}
                    alt={service?.name || 'Servicio'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                    Servicio sin foto
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm text-[#64748B]">
                <p>
                  Servicio:{' '}
                  <span className="font-semibold text-[#0E2A47]">{service?.name || 'Sin seleccionar'}</span>
                </p>
                <p>
                  Pago:{' '}
                  <span className="font-semibold text-[#0E2A47]">
                    {getPaymentTypeLabel(service?.paymentType)}
                  </span>
                </p>
                <p>
                  Profesional:{' '}
                  <span className="font-semibold text-[#0E2A47]">
                    {professional?.fullName || 'Sin seleccionar'}
                  </span>
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

              <div className="mt-4 rounded-[14px] border border-[#E2E7EC] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
                {isPrepaidBooking(service?.paymentType)
                  ? 'El backend define el monto del checkout y el estado final de confirmación. Plura solo muestra ese resultado.'
                  : 'Esta reserva no abre checkout. El backend mantiene el estado operativo de la reserva.'}
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  !selectedTime ||
                  isSaving ||
                  isLoadingContext ||
                  !service?.id ||
                  clientLoading ||
                  !clientHasLoaded
                }
                className={`mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  selectedTime &&
                  !isSaving &&
                  !isLoadingContext &&
                  service?.id &&
                  !clientLoading &&
                  clientHasLoaded
                    ? 'bg-[#0B1D2A] text-white hover:-translate-y-0.5 hover:shadow-md'
                    : 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isSaving
                  ? 'Preparando reserva...'
                  : isPrepaidBooking(service?.paymentType)
                    ? 'Reservar y abrir checkout'
                    : 'Confirmar reserva'}
              </button>

              {saveMessage ? (
                <p className="mt-3 text-xs font-semibold text-[#1FB6A6]">{saveMessage}</p>
              ) : null}
              {saveError ? (
                <p className="mt-3 text-xs font-semibold text-[#EF4444]">{saveError}</p>
              ) : null}
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
