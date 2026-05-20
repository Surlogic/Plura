import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { isAxiosError } from 'axios';
import EmailVerificationPanel from '@/components/auth/EmailVerificationPanel';
import Footer from '@/components/shared/Footer';
import ReservationAuthOverlay from '@/components/reservation/ReservationAuthOverlay';
import Navbar from '@/components/shared/Navbar';
import ReservationScheduleStep from '@/components/reservation/ReservationScheduleStep';
import ReservationServiceSelector from '@/components/reservation/ReservationServiceSelector';
import ReservationSummaryCard from '@/components/reservation/ReservationSummaryCard';
import Button from '@/components/ui/Button';
import type { ClientProfile } from '@/types/client';
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
import {
  confirmPhoneVerification,
  sendPhoneVerification,
} from '@/services/phoneVerification';
import { describeBookingPolicy, isPrepaidBooking } from '@/utils/bookings';
import {
  type CheckoutOpenResult,
  openCheckoutUrl,
} from '@/utils/checkoutWindow';
import { getKnownAuthSessionRole, hasKnownAuthSession } from '@/services/session';
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

type ReservationStep = 1 | 2 | 3;

const normalizeServiceId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).trim();
  }
  return '';
};

const parseStepValue = (value: string): ReservationStep | null => {
  const parsed = Number.parseInt(value, 10);
  if (parsed >= 1 && parsed <= 3) {
    return parsed as ReservationStep;
  }
  if (parsed === 4 || parsed === 5) {
    return 3;
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
  if (!confirmedDate || !selectedTime) return 2 as ReservationStep;
  if (requestedStep === 2) return 2 as ReservationStep;
  return 3 as ReservationStep;
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
  const {
    profile: clientProfile,
    hasLoaded: clientHasLoaded,
    isLoading: clientLoading,
    refreshProfile: refreshClientProfile,
  } = useClientProfileContext();
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
  const [reservationPhoneCode, setReservationPhoneCode] = useState('');
  const [reservationPhoneMessage, setReservationPhoneMessage] = useState<string | null>(null);
  const [isSendingReservationPhoneCode, setIsSendingReservationPhoneCode] = useState(false);
  const [isConfirmingReservationPhoneCode, setIsConfirmingReservationPhoneCode] = useState(false);
  const [phoneVerifiedInReservation, setPhoneVerifiedInReservation] = useState(false);
  const [emailVerificationPromptBooking, setEmailVerificationPromptBooking] = useState<{
    bookingId: number;
    requiresCheckout: boolean;
  } | null>(null);
  const [isContinuingAfterEmailPrompt, setIsContinuingAfterEmailPrompt] = useState(false);

  const professionalSlug = resolveQueryValue(router.query.profesional).trim();
  const serviceId =
    normalizeServiceId(resolveQueryValue(router.query.serviceId)) ||
    normalizeServiceId(resolveQueryValue(router.query.servicioId));
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
    () =>
      professional?.services.find(
        (item) => normalizeServiceId(item.id) === normalizeServiceId(selectedServiceId),
      ) ?? null,
    [professional?.services, selectedServiceId],
  );
  const confirmedService = useMemo(
    () =>
      professional?.services.find(
        (item) => normalizeServiceId(item.id) === normalizeServiceId(confirmedServiceId),
      ) ?? null,
    [professional?.services, confirmedServiceId],
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

  const publicProfileSlug = professionalSlug || professional?.slug?.trim() || '';
  const publicProfileHref = publicProfileSlug
    ? `/profesional/pagina/${encodeURIComponent(publicProfileSlug)}`
    : null;

  const canSubmit = Boolean(confirmedService?.id && confirmedDate && selectedTime);
  const clientPhoneVerified = Boolean(clientProfile?.phoneVerified || phoneVerifiedInReservation);
  const clientNeedsPhoneVerification = Boolean(clientProfile && !clientPhoneVerified);
  const knownSessionRole = getKnownAuthSessionRole();
  const shouldWaitForClientSession =
    hasKnownAuthSession() && (knownSessionRole === 'CLIENT' || knownSessionRole === null);

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

        const requestedServiceById = serviceId
          ? services.find((item) => normalizeServiceId(item.id) === serviceId) ?? null
          : null;
        const requestedServiceByName = !serviceId && serviceNameQuery
          ? services.find(
              (item) => item.name.trim().toLowerCase() === serviceNameQuery.toLowerCase(),
            ) ?? null
          : null;
        const hasRequestedService = Boolean(serviceId || serviceNameQuery);
        const pendingServiceId = normalizeServiceId(pendingReservation?.serviceId);
        const pendingService = !hasRequestedService && pendingMatchesProfessional
          ? services.find((item) => normalizeServiceId(item.id) === pendingServiceId)
          : null;

        const nextService = requestedServiceById ?? requestedServiceByName ?? pendingService ?? null;
        const nextServiceId = normalizeServiceId(nextService?.id);
        const nextSelectedDate = resolveInitialDate(
          routeStateRef.current.dateQuery || (pendingMatchesProfessional ? pendingReservation?.date || '' : ''),
          calendarDays,
        );
        const nextSelectedTime = routeStateRef.current.timeQuery
          || (pendingMatchesProfessional ? pendingReservation?.time || '' : '');

        setSelectedServiceId(nextServiceId || null);
        setSelectedDate(nextSelectedDate);
        setSelectedTime(nextSelectedTime || null);

        const requestedStep = parseStepValue(routeStateRef.current.stepQuery);

        if (resumeQuery === '1' && nextServiceId && nextSelectedDate && nextSelectedTime) {
          setConfirmedServiceId(nextServiceId);
          setConfirmedDate(nextSelectedDate);
          setActiveStep(3);
          setIsEditingServiceSelection(false);
          setSaveError('Retomaste la reserva. Revisá el resumen final y confirmá para continuar.');
        } else if (requestedStep) {
          const restoredConfirmedServiceId = requestedStep >= 2 && nextServiceId
            ? nextServiceId
            : null;
          const restoredConfirmedDate = requestedStep >= 3 ? nextSelectedDate : null;
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

        const hasInvalidRequestedService =
          (Boolean(serviceId) && !requestedServiceById) ||
          (!serviceId && Boolean(serviceNameQuery) && !requestedServiceByName);

        if (hasInvalidRequestedService) {
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
    const slotDate = activeStep === 2 ? selectedDate : confirmedDate;

    if (!confirmedService?.id || !slotDate) {
      setSlots([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingSlots(true);

    getPublicSlots(professionalSlug, slotDate, confirmedService.id)
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
  }, [activeStep, professionalSlug, confirmedDate, confirmedService?.id, selectedDate]);

  useEffect(() => {
    if (!router.isReady || !professionalSlug) return;

    const syncedServiceId = selectedServiceId || '';
    const syncedDate = activeStep >= 2 ? (activeStep === 2 ? selectedDate || '' : confirmedDate || selectedDate || '') : '';
    const syncedTime = activeStep >= 2 ? selectedTime || '' : '';
    const nextStepValue = String(activeStep);
    const currentStepValue = resolveQueryValue(router.query.step).trim();
    const currentServiceId = normalizeServiceId(resolveQueryValue(router.query.serviceId)) ||
      normalizeServiceId(resolveQueryValue(router.query.servicioId));
    const currentDate = resolveQueryValue(router.query.date).trim();
    const currentTime = resolveQueryValue(router.query.time).trim();
    const currentResume = resolveQueryValue(router.query.resume).trim();

    if (currentServiceId && !selectedServiceId && !professional?.id) {
      return;
    }

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
    professional?.id,
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
    if (activeStep > 2 && (!confirmedDate || !selectedTime)) {
      setActiveStep(2);
    }
  }, [activeStep, confirmedDate, confirmedService?.id, selectedTime]);

  const resetMessages = () => {
    setSaveError(null);
    setSaveMessage(null);
  };

  useEffect(() => {
    if (!clientProfile) {
      setPhoneVerifiedInReservation(false);
      setReservationPhoneCode('');
      setReservationPhoneMessage(null);
      return;
    }
    if (clientProfile.phoneVerified) {
      setPhoneVerifiedInReservation(false);
      setReservationPhoneCode('');
      setReservationPhoneMessage(null);
    }
  }, [clientProfile?.id, clientProfile?.phoneVerified]);

  const handleSelectService = (serviceSelectionId: string) => {
    setSelectedServiceId(normalizeServiceId(serviceSelectionId) || null);
    resetMessages();
  };

  const handleEditService = () => {
    setActiveStep(1);
    setIsEditingServiceSelection(true);
    resetMessages();
  };

  const handleConfirmService = () => {
    const normalizedSelectedServiceId = normalizeServiceId(selectedService?.id);

    if (!normalizedSelectedServiceId || !selectedService) {
      setSaveMessage(null);
      setSaveError('Elegí un servicio para continuar.');
      return;
    }

    const serviceChanged = confirmedServiceId !== normalizedSelectedServiceId;
    setConfirmedServiceId(normalizedSelectedServiceId);
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
    if (selectedDate !== dateKey) {
      setSelectedTime(null);
    }
    setSelectedDate(dateKey);
    resetMessages();
  };

  const handleContinueSchedule = () => {
    if (!selectedDate) {
      setSaveMessage(null);
      setSaveError('Elegí un día para continuar.');
      return;
    }

    if (!selectedTime) {
      setSaveMessage(null);
      setSaveError('Elegí un horario para continuar.');
      return;
    }

    setConfirmedDate(selectedDate);
    setActiveStep(3);

    resetMessages();
  };

  const handleEditSchedule = () => {
    setActiveStep(2);
    resetMessages();
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    resetMessages();
  };

  const handleCancelReservation = () => {
    clearPendingReservation();
    setIsAuthOverlayOpen(false);
    setEmailVerificationPromptBooking(null);
    resetMessages();
    void router.push(
      professionalSlug
        ? `/profesional/pagina/${encodeURIComponent(professionalSlug)}`
        : '/explorar',
    );
  };

  const continueAfterCreatedBooking = async (bookingId: number, requiresCheckout: boolean) => {
    setEmailVerificationPromptBooking(null);

    if (requiresCheckout) {
      const paymentSession = await createClientBookingPaymentSession(String(bookingId));
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
          bookingId: String(bookingId),
          checkout: checkoutMode,
        },
      });
      return;
    }

    setSaveMessage('Reserva creada. Te llevamos al estado de la reserva.');
    void router.push({
      pathname: '/cliente/reservas',
      query: {
        bookingId: String(bookingId),
        created: '1',
      },
    });
  };

  const handleContinueAfterEmailPrompt = async () => {
    if (!emailVerificationPromptBooking) return;

    setIsContinuingAfterEmailPrompt(true);
    setSaveError(null);
    try {
      await continueAfterCreatedBooking(
        emailVerificationPromptBooking.bookingId,
        emailVerificationPromptBooking.requiresCheckout,
      );
    } catch (error) {
      setSaveMessage(null);
      setSaveError(extractApiMessage(error, RESERVATION_ERROR_FALLBACK));
    } finally {
      setIsContinuingAfterEmailPrompt(false);
    }
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
    setEmailVerificationPromptBooking(null);

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

      if (created.emailVerificationRequired) {
        setEmailVerificationPromptBooking({ bookingId: created.id, requiresCheckout });
        setSaveMessage('Reserva creada. Verificá tu email para completar tu cuenta.');
        return;
      }

      await continueAfterCreatedBooking(created.id, requiresCheckout);
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
      } else if (isAxiosError(error) && error.response?.status === 403) {
        setSaveError(extractApiMessage(error, 'Necesitás verificar tu celular antes de reservar.'));
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

    if (shouldWaitForClientSession && (!clientHasLoaded || clientLoading)) {
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

    if (!clientPhoneVerified) {
      setSaveMessage(null);
      setSaveError('Necesitás verificar tu celular antes de confirmar la reserva. Ingresá el código SMS en este paso para continuar.');
      return;
    }

    await submitReservation();
  };

  const handleAuthenticatedReservation = async (authenticatedProfile?: ClientProfile) => {
    setSaveMessage('Sesión lista. Estamos confirmando tu reserva...');
    setSaveError(null);

    const resolvedClientProfile = authenticatedProfile ?? clientProfile;
    if (!resolvedClientProfile) {
      setSaveMessage(null);
      setSaveError('Estamos verificando tu sesión de cliente. Intentá confirmar nuevamente.');
      return;
    }

    if (!resolvedClientProfile.phoneVerified && !phoneVerifiedInReservation) {
      setSaveMessage(null);
      setSaveError('Necesitás verificar tu celular antes de confirmar la reserva. Ingresá el código SMS en este paso para continuar.');
      return;
    }

    await submitReservation();
  };

  const handleSendReservationPhoneCode = async () => {
    if (!clientProfile?.phoneNumber) {
      setSaveMessage(null);
      setSaveError('Tu cuenta no tiene un celular cargado para verificar.');
      return;
    }

    setSaveError(null);
    setReservationPhoneMessage(null);

    try {
      setIsSendingReservationPhoneCode(true);
      const response = await sendPhoneVerification(clientProfile.phoneNumber);
      setReservationPhoneMessage(response.message);
    } catch (error) {
      setSaveError(extractApiMessage(error, 'No se pudo enviar el código SMS.'));
    } finally {
      setIsSendingReservationPhoneCode(false);
    }
  };

  const handleConfirmReservationPhoneCode = async () => {
    const code = reservationPhoneCode.trim();

    if (!code) {
      setSaveMessage(null);
      setSaveError('Ingresá el código SMS para verificar tu celular.');
      return;
    }

    setSaveError(null);

    try {
      setIsConfirmingReservationPhoneCode(true);
      await confirmPhoneVerification(code);
      setPhoneVerifiedInReservation(true);
      setReservationPhoneCode('');
      setReservationPhoneMessage('Celular verificado correctamente. Ya podés confirmar la reserva.');
      await refreshClientProfile();
    } catch (error) {
      setSaveError(extractApiMessage(error, 'No se pudo verificar el código SMS.'));
    } finally {
      setIsConfirmingReservationPhoneCode(false);
    }
  };

  const policyDescription = describeBookingPolicy(professional?.bookingPolicy);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf7f1_0%,#f5f1eb_44%,#efe7db_100%)] text-[color:var(--ink)]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1040px] px-4 pb-20 pt-4 sm:px-5 lg:px-6 lg:pt-4">
        {publicProfileHref ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border-soft)] bg-white/88 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Perfil público
              </p>
              <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
                {professional?.fullName || 'Volver al profesional'}
              </p>
            </div>

            <Button href={publicProfileHref} variant="quiet" size="sm" className="shrink-0">
              ← Volver al perfil
            </Button>
          </div>
        ) : null}

        {!isLoadingContext && contextError ? (
          <div className="rounded-[22px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm font-medium text-[#DC2626]">
            {contextError}
          </div>
        ) : null}

        {isLoadingContext && !professional ? (
          <div className="rounded-[22px] border border-[color:var(--border-soft)] bg-white/90 px-5 py-4 text-sm text-[color:var(--ink-muted)]">
            Cargando información del profesional y disponibilidad...
          </div>
        ) : null}

        <section className="mt-4 space-y-5">
          {activeStep !== 3 && saveMessage ? (
            <div className="rounded-[22px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55 px-5 py-4 text-sm font-medium text-[color:var(--success)]">
              {saveMessage}
            </div>
          ) : null}

          {activeStep !== 3 && saveError ? (
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
              isLoadingSlots={isLoadingSlots}
              onCancel={handleCancelReservation}
              onContinue={handleContinueSchedule}
              onEditService={handleEditService}
              onSelectDate={handleSelectDate}
              onSelectTime={handleSelectTime}
              selectedDate={selectedDate}
              selectedDateLabel={selectedDateLabel}
              selectedServiceName={confirmedService?.name}
              selectedTime={selectedTime}
              serviceDurationLabel={formatDuration(confirmedService?.duration)}
              slots={slots}
            />
          ) : null}

          {activeStep === 3 ? (
            <>
              {clientNeedsPhoneVerification ? (
                <div className="rounded-[28px] border border-[color:var(--border-soft)] bg-white/92 p-5 shadow-[var(--shadow-card)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                      Verificación requerida
                    </p>
                    <h2 className="text-lg font-semibold text-[color:var(--ink)]">
                      Verificá tu celular para reservar
                    </h2>
                    <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
                      Para confirmar esta reserva necesitamos validar el celular asociado a tu cuenta
                      {clientProfile?.phoneNumber ? ` (${clientProfile.phoneNumber})` : ''}.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      className="h-12 w-full rounded-[18px] border border-[color:var(--border-soft)] bg-white/90 px-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-4 focus:ring-[color:var(--focus-ring)]"
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) => setReservationPhoneCode(event.target.value)}
                      placeholder="Código SMS"
                      value={reservationPhoneCode}
                    />
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => void handleSendReservationPhoneCode()}
                      disabled={isSendingReservationPhoneCode || isConfirmingReservationPhoneCode}
                    >
                      {isSendingReservationPhoneCode ? 'Enviando...' : 'Enviar código'}
                    </Button>
                    <Button
                      type="button"
                      variant="brand"
                      onClick={() => void handleConfirmReservationPhoneCode()}
                      disabled={isSendingReservationPhoneCode || isConfirmingReservationPhoneCode || !reservationPhoneCode.trim()}
                    >
                      {isConfirmingReservationPhoneCode ? 'Verificando...' : 'Verificar'}
                    </Button>
                  </div>

                  {reservationPhoneMessage ? (
                    <p className="mt-3 text-sm font-medium text-[color:var(--primary)]">
                      {reservationPhoneMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {emailVerificationPromptBooking ? (
                <div className="rounded-[28px] border border-[color:var(--border-soft)] bg-white/92 p-5 shadow-[var(--shadow-card)]">
                  <EmailVerificationPanel
                    email={clientProfile?.email}
                    emailVerified={clientProfile?.emailVerified}
                    onStatusChanged={refreshClientProfile}
                    tone="client"
                    variant="banner"
                    title="Verificá tu email"
                    description="Tu reserva ya fue creada. Confirmá tu email para completar tu cuenta."
                  />

                  {saveMessage ? (
                    <div className="mt-4 rounded-[18px] border border-[color:var(--success-soft)] bg-[color:var(--success-soft)]/55 px-4 py-3 text-sm font-medium text-[color:var(--success)]">
                      {saveMessage}
                    </div>
                  ) : null}

                  {saveError ? (
                    <div className="mt-4 rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
                      {saveError}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="brand"
                      onClick={() => void handleContinueAfterEmailPrompt()}
                      disabled={isContinuingAfterEmailPrompt || isSaving}
                    >
                      {isContinuingAfterEmailPrompt
                        ? 'Continuando...'
                        : emailVerificationPromptBooking.requiresCheckout
                          ? 'Continuar al pago'
                          : 'Ver mi reserva'}
                    </Button>
                    <Button type="button" variant="quiet" onClick={handleCancelReservation}>
                      Salir
                    </Button>
                  </div>
                </div>
              ) : (
                <ReservationSummaryCard
                  canSubmit={canSubmit}
                  isLoadingContext={isLoadingContext}
                  requiresAuthentication={!clientProfile}
                  isSaving={isSaving}
                  onCancel={handleCancelReservation}
                  onConfirm={handleConfirm}
                  onEditSchedule={handleEditSchedule}
                  onEditService={handleEditService}
                  policyDescription={policyDescription}
                  professional={professional}
                  saveError={saveError}
                  saveMessage={saveMessage}
                  selectedDateLabel={confirmedDateLabel}
                  selectedService={confirmedService}
                  selectedTime={selectedTime}
                />
              )}
            </>
          ) : null}
        </section>
      </main>

      <ReservationAuthOverlay
        isOpen={isAuthOverlayOpen}
        onAuthenticated={handleAuthenticatedReservation}
        onClose={() => setIsAuthOverlayOpen(false)}
      />

      <Footer />
    </div>
  );
}
