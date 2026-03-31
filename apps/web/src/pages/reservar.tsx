import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { isAxiosError } from 'axios';
import Footer from '@/components/shared/Footer';
import ReservationAuthOverlay from '@/components/reservation/ReservationAuthOverlay';
import Navbar from '@/components/shared/Navbar';
import ReservationFlowHeader from '@/components/reservation/ReservationFlowHeader';
import ReservationProgressSidebar from '@/components/reservation/ReservationProgressSidebar';
import ReservationReviewStep from '@/components/reservation/ReservationReviewStep';
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
import { describeBookingPolicy, isPrepaidBooking } from '@/utils/bookings';
import {
  type CheckoutOpenResult,
  openCheckoutUrl,
} from '@/utils/checkoutWindow';
import {
  type WorkDayKey,
  DAYS_AHEAD,
  RESERVATION_ERROR_FALLBACK,
  RESERVATION_TIMEOUT_ERROR,
  extractApiMessage,
  formatDuration,
  resolveQueryValue,
  toLocalDateKey,
  dayKeyByIndex,
  isReservationTimeoutError,
  weekOrder,
} from '@/utils/reservarHelpers';

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayKey: WorkDayKey;
};

type ReservationStep = 1 | 2 | 3 | 4 | 5;

const parseStepValue = (value: string): ReservationStep | null => {
  const parsed = Number.parseInt(value, 10);
  if (parsed >= 1 && parsed <= 5) {
    return parsed as ReservationStep;
  }
  return null;
};

const resolveStepByState = ({
  confirmedDate,
  confirmedServiceId,
  requestedStep,
  selectedTime,
}: {
  confirmedDate: string | null;
  confirmedServiceId: string | null;
  requestedStep: ReservationStep | null;
  selectedTime: string | null;
}) => {
  if (!confirmedServiceId) return 1 as ReservationStep;
  if (!requestedStep || requestedStep <= 1) return 1 as ReservationStep;
  if (!confirmedDate) return 2 as ReservationStep;
  if (requestedStep === 2) return 2 as ReservationStep;
  if (!selectedTime) return 3 as ReservationStep;
  if (requestedStep === 3) return 3 as ReservationStep;
  if (requestedStep === 4) return 4 as ReservationStep;
  return 5 as ReservationStep;
};

const resolveInitialDate = (
  dateValue: string,
  calendarDays: CalendarDay[],
) => {
  if (!dateValue) return null;
  return calendarDays.some((item) => item.dateKey === dateValue) ? dateValue : null;
};

export default function ReservationPage() {
  const router = useRouter();
  const { profile: clientProfile, hasLoaded: clientHasLoaded, isLoading: clientLoading } =
    useClientProfileContext();
  const [professional, setProfessional] = useState<PublicProfessionalPage | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [confirmedServiceId, setConfirmedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeServiceCategory, setActiveServiceCategory] = useState('');
  const [activeStep, setActiveStep] = useState<ReservationStep>(1);
  const [isEditingServiceSelection, setIsEditingServiceSelection] = useState(false);
  const [isAuthOverlayOpen, setIsAuthOverlayOpen] = useState(false);

  const professionalSlug = resolveQueryValue(router.query.profesional).trim();
  const serviceId =
    resolveQueryValue(router.query.serviceId).trim() ||
    resolveQueryValue(router.query.servicioId).trim();
  const serviceNameQuery = resolveQueryValue(router.query.servicio).trim();
  const dateQuery = resolveQueryValue(router.query.date).trim();
  const timeQuery = resolveQueryValue(router.query.time).trim();
  const resumeQuery = resolveQueryValue(router.query.resume).trim();
  const stepQuery = resolveQueryValue(router.query.step).trim();
  const routeStateRef = useRef({
    dateQuery: '',
    stepQuery: '',
    timeQuery: '',
  });

  useEffect(() => {
    routeStateRef.current = {
      dateQuery,
      stepQuery,
      timeQuery,
    };
  }, [dateQuery, stepQuery, timeQuery]);

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

  const confirmedService = useMemo(
    () => professional?.services.find((item) => item.id === confirmedServiceId) ?? null,
    [professional?.services, confirmedServiceId],
  );

  const headerService = activeStep === 1 ? selectedService : confirmedService ?? selectedService;

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

  const confirmedDateLabel = useMemo(() => {
    if (!confirmedDate) return 'Elegí una fecha';
    const date = calendarDays.find((item) => item.dateKey === confirmedDate)?.date;
    if (!date) return 'Elegí una fecha';
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [calendarDays, confirmedDate]);

  const canSubmit = Boolean(confirmedService?.id && confirmedDate && selectedTime);

  const persistPendingReservation = () => {
    if (!professionalSlug || !confirmedService?.id || !confirmedDate || !selectedTime) {
      return;
    }

    savePendingReservation({
      professionalSlug,
      serviceId: confirmedService.id,
      date: confirmedDate,
      time: selectedTime,
      professionalName: professional?.fullName || undefined,
      serviceName: confirmedService.name,
    });
  };

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
    setSaveError(null);

    if (!professionalSlug) {
      setProfessional(null);
      setSelectedServiceId(null);
      setConfirmedServiceId(null);
      setContextError('Falta el slug del profesional para reservar.');
      return;
    }

    setIsLoadingContext(true);
    getPublicProfessionalBySlug(professionalSlug)
      .then((response) => {
        const services = Array.isArray(response.services) ? response.services : [];
        const pendingReservation = resumeQuery === '1' ? getPendingReservation() : null;
        const pendingMatchesProfessional = pendingReservation?.professionalSlug === professionalSlug;

        setProfessional(response);

        if (services.length === 0) {
          setSelectedServiceId(null);
          setConfirmedServiceId(null);
          setContextError('Este profesional todavía no tiene servicios públicos para reservar.');
          return;
        }

        const byId = serviceId
          ? services.find((item) => item.id === serviceId)
          : undefined;
        const byName = !byId && serviceNameQuery
          ? services.find(
              (item) => item.name.trim().toLowerCase() === serviceNameQuery.toLowerCase(),
            )
          : undefined;
        const pendingService = pendingMatchesProfessional
          ? services.find((item) => item.id === pendingReservation?.serviceId)
          : undefined;

        const nextService = byId ?? byName ?? pendingService ?? null;
        const nextSelectedDate = resolveInitialDate(
          routeStateRef.current.dateQuery || (pendingMatchesProfessional ? pendingReservation?.date || '' : ''),
          calendarDays,
        );
        const nextSelectedTime = routeStateRef.current.timeQuery
          || (pendingMatchesProfessional ? pendingReservation?.time || '' : '');

        setSelectedServiceId(nextService?.id ?? null);
        setSelectedDate(nextSelectedDate);
        setSelectedTime(nextSelectedTime || null);

        const requestedStep = parseStepValue(routeStateRef.current.stepQuery);

        if (resumeQuery === '1' && nextService?.id && nextSelectedDate && nextSelectedTime) {
          setConfirmedServiceId(nextService.id);
          setConfirmedDate(nextSelectedDate);
          setActiveStep(5);
          setIsEditingServiceSelection(false);
          setSaveError('Retomaste la reserva. Revisá el resumen final y confirmá para continuar.');
        } else if (requestedStep) {
          const restoredConfirmedServiceId = requestedStep >= 2 && nextService?.id
            ? nextService.id
            : null;
          const restoredConfirmedDate = requestedStep >= 3
            ? nextSelectedDate
            : null;
          const restoredStep = resolveStepByState({
            confirmedDate: restoredConfirmedDate,
            confirmedServiceId: restoredConfirmedServiceId,
            requestedStep,
            selectedTime: nextSelectedTime || null,
          });

          setConfirmedServiceId(restoredConfirmedServiceId);
          setConfirmedDate(restoredConfirmedDate);
          setActiveStep(restoredStep);
          setIsEditingServiceSelection(restoredStep === 1 && !nextService);
        } else {
          setConfirmedServiceId(null);
          setConfirmedDate(null);
          setActiveStep(1);
          setIsEditingServiceSelection(!nextService);
          if (resumeQuery === '1') {
            setSaveError('Retomá la reserva desde el paso siguiente disponible.');
          }
        }

        if ((serviceId || serviceNameQuery) && !byId && !byName) {
          setSaveError('El servicio elegido ya no está disponible. Elegí otro para continuar.');
          setIsEditingServiceSelection(true);
        }
      })
      .catch((error) => {
        setProfessional(null);
        setSelectedServiceId(null);
        setConfirmedServiceId(null);
        setContextError(
          extractApiMessage(error, 'No se pudo cargar la información del profesional.'),
        );
      })
      .finally(() => {
        setIsLoadingContext(false);
      });
  }, [calendarDays, professionalSlug, resumeQuery, router.isReady, serviceId, serviceNameQuery, stepQuery]);

  useEffect(() => {
    if (!confirmedService?.id || !confirmedDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSlots(true);

    getPublicSlots(professionalSlug, confirmedDate, confirmedService.id)
      .then((response) => {
        if (isCancelled) return;
        setSlots(response);
        let clearedUnavailableTime = false;
        setSelectedTime((current) => {
          if (current && response.includes(current)) {
            return current;
          }
          if (current) {
            clearedUnavailableTime = true;
          }
          return null;
        });
        if (clearedUnavailableTime) {
          setSaveError('El horario elegido ya no está disponible. Elegí otro para continuar.');
        }
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
  }, [professionalSlug, confirmedDate, confirmedService?.id]);

  useEffect(() => {
    if (!router.isReady || !professionalSlug) return;

    const syncedServiceId = selectedServiceId || '';
    const syncedDate = activeStep >= 2 ? (activeStep === 2 ? selectedDate || '' : confirmedDate || selectedDate || '') : '';
    const syncedTime = activeStep >= 4 ? selectedTime || '' : '';
    const nextStepValue = String(activeStep);
    const currentStepValue = resolveQueryValue(router.query.step).trim();
    const currentServiceId = resolveQueryValue(router.query.serviceId).trim() ||
      resolveQueryValue(router.query.servicioId).trim();
    const currentDate = resolveQueryValue(router.query.date).trim();
    const currentTime = resolveQueryValue(router.query.time).trim();
    const currentResume = resolveQueryValue(router.query.resume).trim();

    if (
      currentServiceId === syncedServiceId &&
      currentDate === syncedDate &&
      currentTime === syncedTime &&
      currentStepValue === nextStepValue &&
      currentResume !== '1'
    ) {
      return;
    }

    const nextQuery: Record<string, string> = {
      profesional: professionalSlug,
      step: nextStepValue,
    };

    if (syncedServiceId) nextQuery.serviceId = syncedServiceId;
    if (syncedDate) nextQuery.date = syncedDate;
    if (syncedTime) nextQuery.time = syncedTime;

    void router.replace(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [
    activeStep,
    confirmedDate,
    professionalSlug,
    router,
    router.isReady,
    selectedDate,
    selectedServiceId,
    selectedTime,
  ]);

  useEffect(() => {
    if (activeStep > 1 && !confirmedService?.id) {
      setActiveStep(1);
      return;
    }
    if (activeStep > 2 && !confirmedDate) {
      setActiveStep(2);
      return;
    }
    if (activeStep > 3 && !selectedTime) {
      setActiveStep(3);
    }
  }, [activeStep, confirmedDate, confirmedService?.id, selectedTime]);

  const resetMessages = () => {
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleSelectService = (serviceSelectionId: string) => {
    setSelectedServiceId(serviceSelectionId);
    resetMessages();
  };

  const handleEditService = () => {
    setActiveStep(1);
    setIsEditingServiceSelection(true);
    resetMessages();
  };

  const handleConfirmService = () => {
    if (!selectedService?.id) {
      setSaveMessage(null);
      setSaveError('Elegí un servicio para continuar.');
      return;
    }

    const serviceChanged = confirmedServiceId !== selectedService.id;
    setConfirmedServiceId(selectedService.id);
    setActiveStep(2);
    setIsEditingServiceSelection(false);

    if (serviceChanged) {
      setSelectedDate(null);
      setConfirmedDate(null);
      setSelectedTime(null);
      setSlots([]);
    }

    resetMessages();
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    resetMessages();
  };

  const handleContinueDay = () => {
    if (!selectedDate) {
      setSaveMessage(null);
      setSaveError('Elegí un día para continuar.');
      return;
    }

    const dayChanged = confirmedDate !== selectedDate;
    setConfirmedDate(selectedDate);
    setActiveStep(3);
    if (dayChanged) {
      setSelectedTime(null);
    }
    resetMessages();
  };

  const handleEditDay = () => {
    setActiveStep(2);
    resetMessages();
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setActiveStep(4);
    resetMessages();
  };

  const handleEditTime = () => {
    setActiveStep(3);
    resetMessages();
  };

  const handleContinueReview = () => {
    setActiveStep(5);
    resetMessages();
  };

  const handleCancelReservation = () => {
    clearPendingReservation();
    setIsAuthOverlayOpen(false);
    resetMessages();
    void router.push(professionalSlug ? `/profesional/${professionalSlug}` : '/explorar');
  };

  const submitReservation = async () => {
    if (!professionalSlug || !confirmedService?.id || !confirmedDate || !selectedTime) {
      setSaveMessage(null);
      setSaveError('Completá servicio, día y horario para reservar.');
      return;
    }

    setIsSaving(true);
    setIsAuthOverlayOpen(false);
    setSaveError(null);
    setSaveMessage(null);

    const requiresCheckout = isPrepaidBooking(confirmedService.paymentType);
    let createdBookingId: number | null = null;

    try {
      const created = await createPublicReservation(professionalSlug, {
        serviceId: confirmedService.id,
        startDateTime: `${confirmedDate}T${selectedTime}`,
      });

      if (!created || typeof created.id !== 'number') {
        throw new Error(RESERVATION_ERROR_FALLBACK);
      }

      createdBookingId = created.id;
      clearPendingReservation();
      setIsAuthOverlayOpen(false);

      if (requiresCheckout) {
        const paymentSession = await createClientBookingPaymentSession(String(created.id));
        const hasCheckoutUrl = Boolean(paymentSession.checkoutUrl);
        let checkoutMode: 'started' | 'failed' | 'synced' = hasCheckoutUrl ? 'started' : 'synced';
        let checkoutOpenResult: CheckoutOpenResult = 'blocked';

        if (paymentSession.checkoutUrl) {
          checkoutOpenResult = openCheckoutUrl(paymentSession.checkoutUrl);
          if (checkoutOpenResult === 'blocked') {
            checkoutMode = 'failed';
          }
        }

        setSaveMessage(getBookingPaymentSessionMessage(paymentSession));
        if (checkoutMode === 'started' && checkoutOpenResult === 'current-tab') {
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
        persistPendingReservation();
        setSaveError('Necesitás iniciar sesión como cliente para confirmar esta reserva.');
        setIsAuthOverlayOpen(true);
      } else {
        setSaveError(extractApiMessage(error, RESERVATION_ERROR_FALLBACK));
      }
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    if (!professionalSlug || !confirmedService?.id || !confirmedDate || !selectedTime) {
      setSaveMessage(null);
      setSaveError('Completá servicio, día y horario para reservar.');
      return;
    }

    if (!clientHasLoaded || clientLoading) {
      setSaveMessage(null);
      setSaveError('Estamos verificando tu sesión. Intentá nuevamente.');
      return;
    }

    if (!clientProfile) {
      persistPendingReservation();
      setSaveMessage(null);
      setSaveError(null);
      setIsAuthOverlayOpen(true);
      return;
    }

    await submitReservation();
  };

  const handleAuthenticatedReservation = async () => {
    setSaveMessage('Sesión lista. Estamos confirmando tu reserva...');
    setSaveError(null);
    await submitReservation();
  };

  const policyDescription = describeBookingPolicy(professional?.bookingPolicy);
  const currentDateLabel = activeStep >= 3 ? confirmedDateLabel : selectedDateLabel;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8f5_0%,#edf2ef_38%,#f8faf9_100%)] text-[color:var(--ink)]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <ReservationFlowHeader
          currentStep={activeStep}
          isLoading={isLoadingContext && !professional}
          professional={professional}
          selectedService={headerService}
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

        <section className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {activeStep !== 5 && saveMessage ? (
              <div className="rounded-[22px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55 px-5 py-4 text-sm font-medium text-[color:var(--success)]">
                {saveMessage}
              </div>
            ) : null}

            {activeStep !== 5 && saveError ? (
              <div className="rounded-[22px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm font-medium text-[#DC2626]">
                {saveError}
              </div>
            ) : null}

            {activeStep === 1 ? (
              <ReservationServiceSelector
                activeCategory={activeServiceCategory}
                categories={serviceCategories}
                onCancel={handleCancelReservation}
                onCategoryChange={setActiveServiceCategory}
                onConfirmService={handleConfirmService}
                onEditService={() => setIsEditingServiceSelection((current) => !current)}
                onSelectService={handleSelectService}
                selectedService={selectedService}
                selectedServiceId={selectedServiceId}
                services={professional?.services ?? []}
                showPicker={isEditingServiceSelection || !selectedService}
              />
            ) : null}

            {activeStep === 2 ? (
              <ReservationScheduleStep
                calendarCells={calendarCells}
                calendarTitle={calendarTitle}
                mode="day"
                onCancel={handleCancelReservation}
                onContinue={handleContinueDay}
                onEditService={handleEditService}
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                selectedDateLabel={selectedDateLabel}
                selectedServiceName={confirmedService?.name}
              />
            ) : null}

            {activeStep === 3 ? (
              <ReservationScheduleStep
                isLoadingSlots={isLoadingSlots}
                mode="time"
                onCancel={handleCancelReservation}
                onEditDay={handleEditDay}
                onSelectTime={handleSelectTime}
                selectedDateLabel={confirmedDateLabel}
                selectedServiceName={confirmedService?.name}
                selectedTime={selectedTime}
                serviceDurationLabel={formatDuration(confirmedService?.duration)}
                slots={slots}
              />
            ) : null}

            {activeStep === 4 ? (
              <ReservationReviewStep
                onCancel={handleCancelReservation}
                onContinue={handleContinueReview}
                onEditDay={handleEditDay}
                onEditService={handleEditService}
                onEditTime={handleEditTime}
                professional={professional}
                selectedDateLabel={confirmedDateLabel}
                selectedService={confirmedService}
                selectedTime={selectedTime}
              />
            ) : null}

            {activeStep === 5 ? (
              <ReservationSummaryCard
                canSubmit={canSubmit}
                clientHasLoaded={clientHasLoaded}
                clientLoading={clientLoading}
                isLoadingContext={isLoadingContext}
                requiresAuthentication={!clientProfile}
                isSaving={isSaving}
                onCancel={handleCancelReservation}
                onConfirm={handleConfirm}
                onEditDay={handleEditDay}
                onEditService={handleEditService}
                onEditTime={handleEditTime}
                policyDescription={policyDescription}
                professional={professional}
                saveError={saveError}
                saveMessage={saveMessage}
                selectedDateLabel={confirmedDateLabel}
                selectedService={confirmedService}
                selectedTime={selectedTime}
              />
            ) : null}
          </div>

          <aside className="hidden xl:block xl:sticky xl:top-24">
            <ReservationProgressSidebar
              currentStep={activeStep}
              policyDescription={policyDescription}
              professional={professional}
              selectedDateLabel={currentDateLabel === 'Elegí una fecha' ? null : currentDateLabel}
              selectedService={headerService}
              selectedTime={activeStep >= 4 ? selectedTime : null}
            />
          </aside>
        </section>
      </main>

      <ReservationAuthOverlay
        dateLabel={confirmedDateLabel}
        isOpen={isAuthOverlayOpen}
        onAuthenticated={handleAuthenticatedReservation}
        onClose={() => setIsAuthOverlayOpen(false)}
        professionalName={professional?.fullName}
        serviceName={confirmedService?.name}
        timeLabel={selectedTime}
      />

      <Footer />
    </div>
  );
}
