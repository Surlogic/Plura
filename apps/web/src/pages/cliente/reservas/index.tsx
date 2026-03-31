import { isAxiosError } from 'axios';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ClientShell from '@/components/cliente/ClientShell';
import ClientReviewReminderCard from '@/components/cliente/reviews/ClientReviewReminderCard';
import ClientBookingTimeline from '@/components/cliente/reservations/ClientBookingTimeline';
import ClientBookingReviewSection from '@/components/cliente/reservations/ClientBookingReviewSection';
import { useClientProfile } from '@/hooks/useClientProfile';
import {
  getBookingPaymentSessionFeedback,
  type BookingPaymentSessionFeedback,
} from '@/lib/bookings/paymentSession';
import {
  cancelClientBooking,
  createClientBookingPaymentSession,
  getBookingActions,
  getClientBookings,
  prefetchClientBookingDetail,
  rescheduleClientBooking,
  type ClientDashboardBooking,
} from '@/services/clientBookings';
import { getPublicSlots } from '@/services/publicBookings';
import {
  describeBookingPolicy,
  formatBookingMoney,
  getClientFinancialStatusCopy,
  getOperationalStatusLabel,
  getOperationalStatusTone,
  getPaymentTypeLabel,
  getRefundStatusCopy,
  isPrepaidBooking,
  shouldAutoRefreshFinancialStatus,
} from '@/utils/bookings';
import {
  type CheckoutOpenResult,
  openCheckoutUrl,
} from '@/utils/checkoutWindow';

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

const isUpcomingBooking = (booking: ClientDashboardBooking, now: Date): boolean => {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false;
  const bookingDate = new Date(booking.startDateTimeUtc || booking.dateTime);
  if (Number.isNaN(bookingDate.getTime())) return false;
  return bookingDate > now;
};

const sortByDateAsc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(a.startDateTimeUtc || a.dateTime).getTime() - new Date(b.startDateTimeUtc || b.dateTime).getTime();

const sortByDateDesc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(b.startDateTimeUtc || b.dateTime).getTime() - new Date(a.startDateTimeUtc || a.dateTime).getTime();

const MAX_FINANCIAL_REFRESH_ATTEMPTS = 8;
const getFinancialRefreshDelayMs = (attempt: number) => Math.min(60000, 15000 * (attempt + 1));

const extractApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

type BookingCardProps = {
  booking: ClientDashboardBooking;
  isSelected: boolean;
  onSelect: (bookingId: string) => void;
};

type PageBanner = BookingPaymentSessionFeedback;

const BookingCard = memo(function BookingCard({ booking, isSelected, onSelect }: BookingCardProps) {
  const financialCopy = getClientFinancialStatusCopy(
    booking.paymentType,
    booking.financialSummary,
    booking.status,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(booking.id)}
      className={`w-full rounded-[20px] border p-4 text-left shadow-sm transition ${
        isSelected
          ? 'border-[#1FB6A6]/45 bg-[#F0FDFA]'
          : 'border-[#E2E7EC] bg-white hover:border-[#CBD5E1]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0E2A47]">
          {booking.time} · {booking.service}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getOperationalStatusTone(booking.status)}`}
        >
          {getOperationalStatusLabel(booking.status)}
        </span>
      </div>

      <p className="mt-2 text-sm text-[#475569]">{booking.professional}</p>
      <p className="mt-1 text-xs text-[#64748B]">{booking.date}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
          {getPaymentTypeLabel(booking.paymentType)}
        </span>
        <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${financialCopy.tone}`}>
          {financialCopy.label}
        </span>
      </div>
    </button>
  );
});

export default function ClienteReservasPage() {
  const router = useRouter();
  const { profile } = useClientProfile();
  const displayName = profile?.fullName || 'Cliente';
  const [bookings, setBookings] = useState<ClientDashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [actions, setActions] = useState<Awaited<ReturnType<typeof getBookingActions>> | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<PageBanner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(toLocalDateKey(new Date()));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [timelineRefreshToken, setTimelineRefreshToken] = useState(0);
  const [reviewReminderRefreshToken, setReviewReminderRefreshToken] = useState(0);

  const queryBookingId = useMemo(() => {
    const value = router.query.bookingId;
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }, [router.query.bookingId]);

  const queryMode = useMemo(() => {
    const checkout = Array.isArray(router.query.checkout)
      ? router.query.checkout[0]
      : router.query.checkout;
    const created = Array.isArray(router.query.created)
      ? router.query.created[0]
      : router.query.created;
    return { checkout, created };
  }, [router.query.checkout, router.query.created]);

  const loadBookings = useCallback(async (keepSelection = true) => {
    try {
      if (!keepSelection) setIsLoading(true);
      setError(null);
      const response = await getClientBookings();
      setBookings(response);
      let nextSelectedBookingId: string | null = null;
      setSelectedBookingId((current) => {
        if (queryBookingId && response.some((booking) => booking.id === queryBookingId)) {
          nextSelectedBookingId = queryBookingId;
          return queryBookingId;
        }
        if (keepSelection && current && response.some((booking) => booking.id === current)) {
          nextSelectedBookingId = current;
          return current;
        }
        nextSelectedBookingId = response[0]?.id ?? null;
        return nextSelectedBookingId;
      });
      if (nextSelectedBookingId) {
        void prefetchClientBookingDetail(nextSelectedBookingId);
      }
    } catch (loadError) {
      setBookings([]);
      setError('No pudimos cargar tus reservas en este momento.');
    } finally {
      setIsLoading(false);
    }
  }, [queryBookingId]);

  const bookingsSnapshotRef = useRef('');

  const refreshBookingsIfChanged = useCallback(async () => {
    try {
      const response = await getClientBookings();
      const snapshot = JSON.stringify(response.map((b) => ({
        id: b.id,
        status: b.status,
        fs: b.financialSummary?.financialStatus,
        ps: b.paymentStatus,
      })));
      if (snapshot === bookingsSnapshotRef.current) return;
      bookingsSnapshotRef.current = snapshot;
      setBookings(response);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    void loadBookings(false);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    let nextBanner: PageBanner | null = null;

    if (queryMode.checkout === 'started') {
      nextBanner = {
        tone: 'info',
        title: 'Seguís el pago en Mercado Pago',
        description: 'Te enviamos a Mercado Pago. Cuando vuelvas, esta vista mostrará el estado actualizado de tu reserva.',
      };
    } else if (queryMode.checkout === 'failed') {
      nextBanner = {
        tone: 'error',
        title: 'No pudimos abrir Mercado Pago',
        description: 'La reserva quedó creada, pero no pudimos abrir Mercado Pago. Revisá el bloqueo de ventanas emergentes o reintentá el pago desde esta vista.',
      };
    } else if (queryMode.checkout === 'synced') {
      nextBanner = {
        tone: 'success',
        title: 'Reserva actualizada',
        description: 'La reserva quedó actualizada con el estado más reciente del pago.',
      };
    } else if (queryMode.created === '1') {
      nextBanner = {
        tone: 'success',
        title: 'Reserva creada',
        description: 'Reserva creada correctamente.',
      };
    }

    if (!nextBanner) {
      return;
    }

    setStatusBanner(nextBanner);

    const nextQuery = { ...router.query };
    delete nextQuery.checkout;
    delete nextQuery.created;
    void router.replace(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [queryMode.checkout, queryMode.created, router.isReady]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    if (!selectedBooking?.id) {
      setActions(null);
      setActionError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingActions(true);
    setActionError(null);

    getBookingActions(selectedBooking.id)
      .then((response) => {
        if (!cancelled) {
          setActions(response);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setActions(null);
          setActionError(
            extractApiMessage(loadError, 'No pudimos cargar las acciones de esta reserva.'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingActions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBooking?.id, selectedBooking?.dateTime, selectedBooking?.status]);

  useEffect(() => {
    if (!selectedBooking?.professionalSlug || !selectedBooking.serviceId || !showReschedule || !rescheduleDate) {
      setSlotOptions([]);
      setSlotError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingSlots(true);
    setSlotError(null);

    getPublicSlots(
      selectedBooking.professionalSlug,
      rescheduleDate,
      selectedBooking.serviceId,
    )
      .then((response) => {
        if (!cancelled) {
          setSlotOptions(response);
          setRescheduleTime((current) => (current && response.includes(current) ? current : ''));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotOptions([]);
          setSlotError('No pudimos cargar horarios disponibles para esa fecha.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rescheduleDate, selectedBooking?.professionalSlug, selectedBooking?.serviceId, showReschedule]);

  useEffect(() => {
    if (actions?.canReschedule) return;
    setShowReschedule(false);
    setRescheduleTime('');
    setSlotOptions([]);
    setSlotError(null);
  }, [actions?.canReschedule]);

  useEffect(() => {
    if (!selectedBooking?.financialSummary?.financialStatus) return;
    if (!shouldAutoRefreshFinancialStatus(selectedBooking.financialSummary.financialStatus)) return;

    let timeoutId: number | null = null;
    let cancelled = false;
    let attempt = 0;

    const clearScheduledRefresh = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleRefresh = () => {
      if (cancelled) return;
      if (attempt >= MAX_FINANCIAL_REFRESH_ATTEMPTS) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (timeoutId !== null) return;

      timeoutId = window.setTimeout(async () => {
        timeoutId = null;
        if (cancelled) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        await refreshBookingsIfChanged();
        attempt += 1;
        scheduleRefresh();
      }, getFinancialRefreshDelayMs(attempt));
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        clearScheduledRefresh();
        return;
      }
      scheduleRefresh();
    };

    scheduleRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearScheduledRefresh();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedBooking?.financialSummary?.financialStatus]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => isUpcomingBooking(booking, now))
      .sort(sortByDateAsc);
  }, [bookings]);

  const pastBookings = useMemo(() => {
    const upcomingIds = new Set(upcomingBookings.map((booking) => booking.id));
    return bookings
      .filter((booking) => !upcomingIds.has(booking.id))
      .sort(sortByDateDesc);
  }, [bookings, upcomingBookings]);

  const financialCopy = getClientFinancialStatusCopy(
    selectedBooking?.paymentType,
    selectedBooking?.financialSummary,
    selectedBooking?.status,
  );
  const canResumeCheckout =
    Boolean(selectedBooking)
    && isPrepaidBooking(selectedBooking?.paymentType)
    && selectedBooking?.financialSummary?.financialStatus === 'PAYMENT_PENDING';

  const handleSelectBooking = (bookingId: string) => {
    void prefetchClientBookingDetail(bookingId);
    setSelectedBookingId(bookingId);
    setShowReschedule(false);
    setRescheduleTime('');
    setSlotError(null);
    setCancelReason('');
    void router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, bookingId },
      },
      undefined,
      { shallow: true },
    );
  };

  const refreshTimeline = () => {
    setTimelineRefreshToken((current) => current + 1);
  };

  const handleStartCheckout = async () => {
    if (!selectedBooking || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);
    setStatusBanner({
      tone: 'info',
      title: 'Preparando pago',
      description: 'Estamos generando tu sesión de pago segura en Mercado Pago.',
    });

    try {
      const session = await createClientBookingPaymentSession(selectedBooking.id);
      const feedback = getBookingPaymentSessionFeedback(session);
      let checkoutOpenResult: CheckoutOpenResult = 'blocked';

      if (session.checkoutUrl) {
        checkoutOpenResult = openCheckoutUrl(session.checkoutUrl);

        if (checkoutOpenResult === 'blocked') {
          setStatusBanner(null);
          setActionError(
            'No pudimos abrir Mercado Pago en esta pestaña. Volvé a intentar.',
          );
        } else if (checkoutOpenResult === 'current-tab') {
          return;
        }
      } else {
        setStatusBanner(feedback);
      }
      await loadBookings();
      refreshTimeline();
    } catch (submitError) {
      setActionError(
            extractApiMessage(submitError, 'No pudimos iniciar el pago de tu reserva en este momento.'),
      );
      setStatusBanner(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      const response = await cancelClientBooking(selectedBooking.id, cancelReason);
      setStatusBanner({
        tone: 'success',
        title: 'Reserva cancelada',
        description: response.plainTextFallback || 'Reserva cancelada correctamente.',
      });
      setCancelReason('');
      setShowReschedule(false);
      await loadBookings();
      refreshTimeline();
    } catch (submitError) {
      setActionError(
        extractApiMessage(submitError, 'No se pudo cancelar la reserva.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      setActionError('Elegí nueva fecha y hora para reagendar.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      const response = await rescheduleClientBooking(
        selectedBooking.id,
        `${rescheduleDate}T${rescheduleTime}:00`,
        selectedBooking.timezone || undefined,
      );
      setStatusBanner({
        tone: 'success',
        title: 'Reserva reagendada',
        description: response.plainTextFallback || 'Reserva reagendada correctamente.',
      });
      setShowReschedule(false);
      setRescheduleTime('');
      await loadBookings();
      refreshTimeline();
    } catch (submitError) {
      setActionError(
        extractApiMessage(submitError, 'No se pudo reagendar la reserva.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientShell name={displayName} active="reservas">
      <section className="space-y-2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">Reservas</p>
        <h1 className="text-3xl font-semibold text-[#0E2A47]">Mis reservas</h1>
        <p className="text-sm text-[#64748B]">
          Revisá el estado de cada reserva, su pago y las acciones disponibles en este momento.
        </p>
      </section>

      <ClientReviewReminderCard refreshToken={reviewReminderRefreshToken} />

      {statusBanner ? (
        <div
          className={`rounded-[18px] border px-4 py-3 text-sm ${
            statusBanner.tone === 'error'
              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
              : statusBanner.tone === 'info'
                ? 'border-[#D9E6F2] bg-[#F8FBFF] text-[#1D4ED8]'
                : 'border-[#BFEDE7] bg-[#F0FDFA] text-[#0F766E]'
          }`}
        >
          <p className="font-semibold">{statusBanner.title}</p>
          <p className="mt-1">{statusBanner.description}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="space-y-3 rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0E2A47]">Próximas reservas</h2>
              <Link
                href="/explorar"
                className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                Explorar más
              </Link>
            </div>

            {isLoading ? (
              <p className="text-sm text-[#64748B]">Cargando reservas...</p>
            ) : upcomingBookings.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                No tenés reservas próximas.
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isSelected={booking.id === selectedBookingId}
                  onSelect={handleSelectBooking}
                />
              ))
            )}
          </div>

          <div className="space-y-3 rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0E2A47]">Historial</h2>
            {isLoading ? (
              <p className="text-sm text-[#64748B]">Cargando historial...</p>
            ) : pastBookings.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                Todavía no hay reservas pasadas.
              </div>
            ) : (
              pastBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isSelected={booking.id === selectedBookingId}
                  onSelect={handleSelectBooking}
                />
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[24px] border border-[#E2E7EC] bg-white p-5 shadow-sm">
            {!selectedBooking ? (
              <div className="rounded-[18px] border border-dashed border-[#E2E7EC] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                Seleccioná una reserva para ver su estado completo.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">
                      Estado de reserva
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#0E2A47]">
                      {selectedBooking.service}
                    </h2>
                    <p className="mt-1 text-sm text-[#64748B]">{selectedBooking.professional}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getOperationalStatusTone(selectedBooking.status)}`}
                  >
                    {getOperationalStatusLabel(selectedBooking.status)}
                  </span>
                </div>

                <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-[#F8FAFC] p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#475569]">
                      {getPaymentTypeLabel(selectedBooking.paymentType)}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${financialCopy.tone}`}>
                      {financialCopy.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#475569]">{financialCopy.detail}</p>

                  <div className="mt-4 space-y-2 text-sm text-[#64748B]">
                    <p>
                      Fecha:{' '}
                      <span className="font-semibold text-[#0E2A47]">
                        {selectedBooking.date} · {selectedBooking.time}
                      </span>
                    </p>
                    <p>
                      Ubicación:{' '}
                      <span className="font-semibold text-[#0E2A47]">{selectedBooking.location}</span>
                    </p>
                    {selectedBooking.financialSummary?.amountHeld ? (
                      <p>
                        Fondos retenidos:{' '}
                        <span className="font-semibold text-[#0E2A47]">
                          {formatBookingMoney(
                            selectedBooking.financialSummary.amountHeld,
                            selectedBooking.financialSummary.currency,
                          )}
                        </span>
                      </p>
                    ) : null}
                    {selectedBooking.financialSummary?.amountRefunded ? (
                      <p>
                        Devuelto:{' '}
                        <span className="font-semibold text-[#0E2A47]">
                          {formatBookingMoney(
                            selectedBooking.financialSummary.amountRefunded,
                            selectedBooking.financialSummary.currency,
                          )}
                        </span>
                      </p>
                    ) : null}
                    <p>
                      Refund:{' '}
                      <span className="font-semibold text-[#0E2A47]">
                        {getRefundStatusCopy(selectedBooking.refundStatus)}
                      </span>
                    </p>
                    <p>
                      Política:{' '}
                      <span className="font-semibold text-[#0E2A47]">
                        {describeBookingPolicy(selectedBooking.policySnapshot)}
                      </span>
                    </p>
                  </div>
                </div>

                <ClientBookingTimeline
                  bookingId={selectedBooking.id}
                  refreshToken={timelineRefreshToken}
                />

                {selectedBooking.status === 'COMPLETED' ? (
                  <ClientBookingReviewSection
                    bookingId={selectedBooking.id}
                    onReviewCreated={() => {
                      setReviewReminderRefreshToken((current) => current + 1);
                    }}
                    onReviewDeleted={() => {
                      setReviewReminderRefreshToken((current) => current + 1);
                    }}
                  />
                ) : null}

                <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#94A3B8]">
                    Lo que podés hacer ahora
                  </p>
                  {isLoadingActions ? (
                    <p className="mt-3 text-sm text-[#64748B]">Cargando acciones…</p>
                  ) : actionError ? (
                    <p className="mt-3 text-sm text-[#B91C1C]">{actionError}</p>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-[#475569]">
                        {actions?.plainTextFallback || 'No hay mensajes adicionales para esta reserva.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actions?.suggestedAction && actions.suggestedAction !== 'NONE' ? (
                          <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[0.72rem] font-semibold text-[#B45309]">
                            Sugerido: reagendar
                          </span>
                        ) : null}
                        {typeof actions?.refundPreviewAmount === 'number' ? (
                          <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-[0.72rem] font-semibold text-[#1D4ED8]">
                            Preview devolución: {formatBookingMoney(actions.refundPreviewAmount, actions.currency)}
                          </span>
                        ) : null}
                        {typeof actions?.retainPreviewAmount === 'number' && actions.retainPreviewAmount > 0 ? (
                          <span className="rounded-full bg-[#FEE2E2] px-3 py-1 text-[0.72rem] font-semibold text-[#B91C1C]">
                            Retención preview: {formatBookingMoney(actions.retainPreviewAmount, actions.currency)}
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                {canResumeCheckout ? (
                  <button
                    type="button"
                    onClick={handleStartCheckout}
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-full bg-[#0B1D2A] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Abriendo Mercado Pago...' : 'Pagar reserva'}
                  </button>
                ) : null}

                {actions?.canCancel ? (
                  <div className="mt-4 space-y-3 rounded-[18px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
                    <p className="text-sm font-semibold text-[#92400E]">Cancelar reserva</p>
                    <textarea
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Motivo opcional"
                      className="min-h-24 w-full rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-sm text-[#0E2A47] outline-none transition focus:border-[#F59E0B]"
                    />
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      disabled={isSubmitting}
                      className="w-full rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#DC2626] transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Cancelando...' : 'Cancelar reserva'}
                    </button>
                  </div>
                ) : null}

                {actions?.canReschedule && selectedBooking.professionalSlug && selectedBooking.serviceId ? (
                  <div className="mt-4 rounded-[18px] border border-[#E2E7EC] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#0E2A47]">Reagendar</p>
                      <button
                        type="button"
                        onClick={() => setShowReschedule((current) => !current)}
                        className="rounded-full border border-[#E2E7EC] px-3 py-1 text-xs font-semibold text-[#475569]"
                      >
                        {showReschedule ? 'Cerrar' : 'Elegir horario'}
                      </button>
                    </div>

                    {showReschedule ? (
                      <div className="mt-4 space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                          Fecha
                          <input
                            type="date"
                            min={toLocalDateKey(new Date())}
                            value={rescheduleDate}
                            onChange={(event) => setRescheduleDate(event.target.value)}
                            className="mt-1.5 w-full rounded-[12px] border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#0E2A47] outline-none transition focus:border-[#1FB6A6]"
                          />
                        </label>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
                            Horarios disponibles
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {isLoadingSlots ? (
                              <p className="col-span-full text-sm text-[#64748B]">Buscando horarios...</p>
                            ) : slotError ? (
                              <p className="col-span-full text-sm text-[#B91C1C]">
                                {slotError}
                              </p>
                            ) : slotOptions.length === 0 ? (
                              <p className="col-span-full text-sm text-[#64748B]">
                                No encontramos horarios para esa fecha.
                              </p>
                            ) : (
                              slotOptions.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setRescheduleTime(slot)}
                                  className={`rounded-[10px] border px-2 py-1.5 text-sm font-semibold transition ${
                                    rescheduleTime === slot
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

                        <button
                          type="button"
                          onClick={handleRescheduleBooking}
                          disabled={isSubmitting || !rescheduleTime}
                          className="w-full rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting ? 'Guardando cambio...' : 'Confirmar nuevo horario'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </section>
    </ClientShell>
  );
}
