import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { isAxiosError } from 'axios';
import dynamic from 'next/dynamic';
import Footer from '@/components/shared/Footer';
import Navbar from '@/components/shared/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ReservationFlowHeader from '@/components/reservation/ReservationFlowHeader';
import ReservationScheduleStep from '@/components/reservation/ReservationScheduleStep';
import ReservationServiceSelector from '@/components/reservation/ReservationServiceSelector';
import ReservationSummaryCard from '@/components/reservation/ReservationSummaryCard';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { getBookingPaymentSessionMessage } from '@/lib/bookings/paymentSession';
import { createClientBookingPaymentSession } from '@/services/clientBookings';
import {
  clearPendingReservation,
  getPendingReservation,
  savePendingReservation,
} from '@/services/pendingReservation';
import {
  createPublicReservation,
  getPublicProfessionalBySlug,
  getPublicSlots,
  type PublicProfessionalPage,
} from '@/services/publicBookings';
import { describeBookingPolicy, getPaymentTypeLabel, isPrepaidBooking } from '@/utils/bookings';
import {
  type CheckoutOpenResult,
  openCheckoutUrl,
} from '@/utils/checkoutWindow';
import {
  type WorkDayKey,
  DAYS_AHEAD,
  RESERVATION_ERROR_FALLBACK,
  RESERVATION_LOGIN_REDIRECT,
  RESERVATION_TIMEOUT_ERROR,
  extractApiMessage,
  formatDuration,
  parseOptionalNumber,
  resolveQueryValue,
  splitLocationLines,
  toLocalDateKey,
  dayKeyByIndex,
  isReservationTimeoutError,
  weekOrder,
} from '@/utils/reservarHelpers';

const PublicProfileMap = dynamic(
  () => import('@/components/profesional/PublicProfileMap'),
  { ssr: false },
);

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayKey: WorkDayKey;
};

export default function ReservationPage() {
  const router = useRouter();
  const { profile: clientProfile, hasLoaded: clientHasLoaded, isLoading: clientLoading } =
    useClientProfileContext();
  const [professional, setProfessional] = useState<PublicProfessionalPage | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdCheckoutBookingId, setCreatedCheckoutBookingId] = useState<string | null>(null);
  const [hasAppliedPendingSelection, setHasAppliedPendingSelection] = useState(false);
  const [activeServiceCategory, setActiveServiceCategory] = useState('');

  const professionalSlug = resolveQueryValue(router.query.profesional).trim();
  const serviceId =
    resolveQueryValue(router.query.serviceId).trim() ||
    resolveQueryValue(router.query.servicioId).trim();
  const serviceNameQuery = resolveQueryValue(router.query.servicio).trim();
  const dateQuery = resolveQueryValue(router.query.date).trim();
  const timeQuery = resolveQueryValue(router.query.time).trim();
  const resumeQuery = resolveQueryValue(router.query.resume).trim();

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const result: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let index = 0; index < DAYS_AHEAD; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      result.push({
        date,
        dateKey: toLocalDateKey(date),
        dayKey: dayKeyByIndex[date.getDay()],
      });
    }

    return result;
  }, []);

  const selectedService = useMemo(
    () => professional?.services.find((item) => item.id === selectedServiceId) ?? null,
    [professional?.services, selectedServiceId],
  );

  const serviceCategories = useMemo(() => {
    const values = new Set<string>();
    professional?.services.forEach((item) => {
      const category = item.categoryName?.trim() || 'Servicios';
      values.add(category);
    });
    return Array.from(values);
  }, [professional?.services]);

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
    if (!selectedDate) return 'Elegí una fecha';
    const date = calendarDays.find((item) => item.dateKey === selectedDate)?.date;
    if (!date) return 'Elegí una fecha';
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [calendarDays, selectedDate]);

  const currentStep = !selectedService ? 1 : !selectedDate ? 2 : !selectedTime ? 3 : 4;
  const canSubmit = Boolean(selectedService?.id && selectedDate && selectedTime);

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

  useEffect(() => {
    setHasAppliedPendingSelection(false);
  }, [professionalSlug]);

  useEffect(() => {
    if (serviceCategories.length === 0) {
      setActiveServiceCategory('');
      return;
    }

    setActiveServiceCategory((current) => {
      if (current && serviceCategories.includes(current)) {
        return current;
      }
      const selectedCategory = selectedService?.categoryName?.trim();
      if (selectedCategory && serviceCategories.includes(selectedCategory)) {
        return selectedCategory;
      }
      return serviceCategories[0];
    });
  }, [selectedService?.categoryName, serviceCategories]);

  useEffect(() => {
    if (!router.isReady) return;

    setContextError(null);
    setSaveMessage(null);

    if (!professionalSlug) {
      setProfessional(null);
      setSelectedServiceId(null);
      setContextError('Falta el slug del profesional para reservar.');
      return;
    }

    setIsLoadingContext(true);
    getPublicProfessionalBySlug(professionalSlug)
      .then((response) => {
        const services = Array.isArray(response.services) ? response.services : [];
        setProfessional(response);

        if (services.length === 0) {
          setSelectedServiceId(null);
          setContextError('Este profesional todavía no tiene servicios públicos para reservar.');
          return;
        }

        const pendingReservation = getPendingReservation();
        const pendingService =
          pendingReservation?.professionalSlug === professionalSlug
            ? services.find((item) => item.id === pendingReservation.serviceId)
            : undefined;
        const byId = serviceId
          ? services.find((item) => item.id === serviceId)
          : undefined;
        const byName = !byId && serviceNameQuery
          ? services.find(
              (item) => item.name.trim().toLowerCase() === serviceNameQuery.toLowerCase(),
            )
          : undefined;

        const nextService = byId ?? byName ?? pendingService ?? services[0] ?? null;
        setSelectedServiceId(nextService?.id ?? null);

        if ((serviceId || serviceNameQuery) && !byId && !byName) {
          setSaveError('El servicio elegido ya no está disponible. Elegí otro para continuar.');
        }
      })
      .catch((error) => {
        setProfessional(null);
        setSelectedServiceId(null);
        setContextError(
          extractApiMessage(error, 'No se pudo cargar la información del profesional.'),
        );
      })
      .finally(() => {
        setIsLoadingContext(false);
      });
  }, [professionalSlug, router.isReady, serviceId, serviceNameQuery]);

  useEffect(() => {
    if (!professionalSlug || !selectedService?.id || !selectedDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSlots(true);

    getPublicSlots(professionalSlug, selectedDate, selectedService.id)
      .then((response) => {
        if (isCancelled) return;
        setSlots(response);
        setSelectedTime((current) => (current && response.includes(current) ? current : null));
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
  }, [professionalSlug, selectedDate, selectedService?.id]);

  useEffect(() => {
    if (hasAppliedPendingSelection) return;
    if (!professionalSlug || !selectedService?.id) return;
    if (calendarDays.length === 0) return;

    const pendingReservation = getPendingReservation();
    if (
      !pendingReservation ||
      pendingReservation.professionalSlug !== professionalSlug ||
      pendingReservation.serviceId !== selectedService.id
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
  }, [calendarDays, hasAppliedPendingSelection, professionalSlug, selectedService?.id]);

  useEffect(() => {
    setCreatedCheckoutBookingId(null);
  }, [professionalSlug, selectedDate, selectedTime, selectedService?.id]);

  const handleSelectService = (serviceSelectionId: string) => {
    setSelectedServiceId(serviceSelectionId);
    setSelectedTime(null);
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSelectedTime(null);
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleViewCreatedBooking = () => {
    if (!createdCheckoutBookingId) return;
    void router.push({
      pathname: '/cliente/reservas',
      query: { bookingId: createdCheckoutBookingId },
    });
  };

  const handleConfirm = async () => {
    if (!professionalSlug || !selectedService?.id || !selectedDate || !selectedTime) {
      setSaveMessage(null);
      setSaveError('Completá servicio, fecha y hora para reservar.');
      return;
    }

    if (!clientHasLoaded || clientLoading) {
      setSaveMessage(null);
      setSaveError('Estamos verificando tu sesión. Intentá nuevamente.');
      return;
    }

    if (!clientProfile) {
      savePendingReservation({
        professionalSlug,
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        professionalName: professional?.fullName || undefined,
        serviceName: selectedService.name,
      });
      void router.push(RESERVATION_LOGIN_REDIRECT);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setCreatedCheckoutBookingId(null);

    const requiresCheckout = isPrepaidBooking(selectedService.paymentType);
    let createdBookingId: number | null = null;

    try {
      const created = await createPublicReservation(professionalSlug, {
        serviceId: selectedService.id,
        startDateTime: `${selectedDate}T${selectedTime}`,
      });

      if (!created || typeof created.id !== 'number') {
        throw new Error(RESERVATION_ERROR_FALLBACK);
      }

      createdBookingId = created.id;
      clearPendingReservation();

      if (requiresCheckout) {
        const paymentSession = await createClientBookingPaymentSession(String(created.id));
        const hasCheckoutUrl = Boolean(paymentSession.checkoutUrl);
        let checkoutMode: 'started' | 'failed' | 'synced' = hasCheckoutUrl ? 'started' : 'synced';
        let checkoutOpenResult: CheckoutOpenResult = 'blocked';
        setCreatedCheckoutBookingId(String(created.id));

        if (paymentSession.checkoutUrl) {
          checkoutOpenResult = openCheckoutUrl(paymentSession.checkoutUrl);
          if (checkoutOpenResult === 'blocked') {
            checkoutMode = 'failed';
          }
        }

        setSaveMessage(getBookingPaymentSessionMessage(paymentSession));
        if (checkoutMode === 'started') {
          if (checkoutOpenResult === 'current-tab') {
            return;
          }
          return;
        }

        void router.push({
          pathname: '/cliente/reservas',
          query: {
            bookingId: String(created.id),
            checkout: checkoutMode,
          },
        });
        return;
      }

      setSaveMessage('Reserva creada. Te llevamos al estado de la reserva.');
      void router.push({
        pathname: '/cliente/reservas',
        query: {
          bookingId: String(created.id),
          created: '1',
        },
      });
    } catch (error) {
      if (createdBookingId !== null) {
        void router.push({
          pathname: '/cliente/reservas',
          query: {
            bookingId: String(createdBookingId),
            checkout: 'failed',
          },
        });
        return;
      }

      if (isReservationTimeoutError(error)) {
        setSaveError(RESERVATION_TIMEOUT_ERROR);
      } else if (isAxiosError(error) && error.response?.status === 409) {
        setSaveError(extractApiMessage(error, 'Ese horario ya está reservado. Elegí otro.'));
      } else if (isAxiosError(error) && error.response?.status === 401) {
        savePendingReservation({
          professionalSlug,
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          professionalName: professional?.fullName || undefined,
          serviceName: selectedService.name,
        });
        setSaveError('Necesitás iniciar sesión como cliente para reservar.');
        void router.push(RESERVATION_LOGIN_REDIRECT);
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
  const policyDescription = describeBookingPolicy(professional?.bookingPolicy);
  const contactPhone = professional?.phoneNumber?.trim() || professional?.phone?.trim() || '';
  const contactEmail = professional?.email?.trim() || '';
  const professionalStory =
    professional?.headline?.trim() ||
    professional?.about?.trim() ||
    professional?.description?.trim() ||
    '';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8f5_0%,#edf2ef_38%,#f8faf9_100%)] text-[color:var(--ink)]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <ReservationFlowHeader
          currentStep={currentStep}
          isLoading={isLoadingContext && !professional}
          professional={professional}
          selectedService={selectedService}
        />

        {!isLoadingContext && contextError ? (
          <div className="mt-6 rounded-[22px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm font-medium text-[#DC2626]">
            {contextError}
          </div>
        ) : null}

        {isLoadingContext && !professional ? (
          <div className="mt-6 rounded-[22px] border border-[color:var(--border-soft)] bg-white/90 px-5 py-4 text-sm text-[color:var(--ink-muted)]">
            Cargando información del profesional y disponibilidad...
          </div>
        ) : null}

        <section className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <ReservationServiceSelector
              activeCategory={activeServiceCategory}
              categories={serviceCategories}
              onCategoryChange={setActiveServiceCategory}
              onSelectService={handleSelectService}
              selectedServiceId={selectedServiceId}
              services={professional?.services ?? []}
            />

            <ReservationScheduleStep
              calendarCells={calendarCells}
              calendarTitle={calendarTitle}
              isLoadingSlots={isLoadingSlots}
              isReady={Boolean(selectedService)}
              onSelectDate={handleSelectDate}
              onSelectTime={handleSelectTime}
              selectedDate={selectedDate}
              selectedDateLabel={selectedDateLabel}
              selectedServiceName={selectedService?.name}
              selectedTime={selectedTime}
              serviceDurationLabel={formatDuration(selectedService?.duration)}
              slots={slots}
            />

            <Card
              tone="default"
              className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-8"
            >
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                  Profesional y lugar
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)] sm:text-3xl">
                  Información útil antes de confirmar
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
                  El perfil público queda para descubrimiento. Acá ves el resumen operativo y la
                  información necesaria para completar la reserva.
                </p>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      Profesional
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                      {professional?.fullName || 'Cargando profesional...'}
                    </p>
                    {professionalStory ? (
                      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-muted)]">
                        {professionalStory}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-muted)]">
                        {selectedService
                          ? `${selectedService.name} · ${formatDuration(selectedService.duration)} · ${getPaymentTypeLabel(selectedService.paymentType)}`
                          : 'Elegí un servicio para completar el resumen de la reserva.'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                      Ubicación y contacto
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-[color:var(--ink-muted)]">
                      <div>
                        <p className="font-semibold text-[color:var(--ink)]">Dirección</p>
                        <p className="mt-1">
                          {addressLine || professional?.location || 'Ubicación a confirmar'}
                        </p>
                        {cityLine ? <p className="mt-1">{cityLine}</p> : null}
                      </div>
                      {contactPhone ? (
                        <div>
                          <p className="font-semibold text-[color:var(--ink)]">Teléfono</p>
                          <p className="mt-1">{contactPhone}</p>
                        </div>
                      ) : null}
                      {contactEmail ? (
                        <div>
                          <p className="font-semibold text-[color:var(--ink)]">Email</p>
                          <p className="mt-1">{contactEmail}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-3">
                  {canRenderReservationMap ? (
                    <PublicProfileMap
                      name={professional?.fullName || 'Profesional'}
                      category={professional?.rubro || 'Servicio'}
                      address={addressLine}
                      city={cityLine}
                      latitude={mapLatitude as number}
                      longitude={mapLongitude as number}
                      heightClassName="h-[320px]"
                    />
                  ) : (
                    <div className="flex h-[320px] items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border-soft)] bg-white px-5 text-center text-sm text-[color:var(--ink-muted)]">
                      No hay mapa disponible para esta dirección.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <aside className="xl:sticky xl:top-24">
            <ReservationSummaryCard
              canSubmit={canSubmit}
              clientHasLoaded={clientHasLoaded}
              clientLoading={clientLoading}
              createdCheckoutBookingId={createdCheckoutBookingId}
              currentStep={currentStep}
              isLoadingContext={isLoadingContext}
              isSaving={isSaving}
              onConfirm={handleConfirm}
              onViewBooking={handleViewCreatedBooking}
              policyDescription={policyDescription}
              professional={professional}
              saveError={saveError}
              saveMessage={saveMessage}
              selectedDateLabel={selectedDateLabel}
              selectedService={selectedService}
              selectedTime={selectedTime}
            />
          </aside>
        </section>
      </main>

      {selectedService ? (
        <div className="fixed inset-x-0 bottom-3 z-40 px-3 xl:hidden">
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 rounded-[24px] border border-white/80 bg-white/96 px-4 py-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
                {selectedService.name}
              </p>
              <p className="truncate text-xs text-[color:var(--ink-muted)]">
                {selectedTime
                  ? `${selectedDateLabel} · ${selectedTime}`
                  : currentStep === 2
                    ? 'Elegí la fecha para continuar'
                    : currentStep === 3
                      ? 'Elegí el horario para continuar'
                      : 'Revisá el resumen y confirmá'}
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={
                !canSubmit ||
                isSaving ||
                isLoadingContext ||
                clientLoading ||
                !clientHasLoaded ||
                Boolean(createdCheckoutBookingId)
              }
            >
              {isSaving
                ? 'Preparando...'
                : isPrepaidBooking(selectedService.paymentType)
                  ? 'Pagar'
                  : 'Confirmar'}
            </Button>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
