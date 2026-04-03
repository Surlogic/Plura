import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  cancelClientBooking,
  createClientBookingPaymentSession,
  getBookingActions,
  getClientBookings,
  rescheduleClientBooking,
  type ClientDashboardBooking,
} from '../../src/services/clientBookings';
import { useFocusEffect } from 'expo-router';
import { getPublicSlots } from '../../src/services/publicBookings';
import { getApiErrorMessage } from '../../src/services/errors';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { theme } from '../../src/theme';
import AuthWall from '../../src/components/auth/AuthWall';
import { openMercadoPagoInAppBrowser } from '../../src/services/mercadoPagoBrowser';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  EmptyState,
  MessageCard,
  ScreenHero,
  SelectionChip,
  SectionHeader,
  StatusPill,
} from '../../src/components/ui/MobileSurface';

const toLocalDateKey = (date: Date) => date.toLocaleDateString('en-CA');

const isUpcomingBooking = (booking: ClientDashboardBooking, now: Date): boolean => {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false;
  const bookingDate = new Date(booking.dateTime);
  if (Number.isNaN(bookingDate.getTime())) return false;
  return bookingDate > now;
};

const sortByDateAsc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();

const sortByDateDesc = (a: ClientDashboardBooking, b: ClientDashboardBooking): number =>
  new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();

const statusLabel = (status: ClientDashboardBooking['status']) => {
  if (status === 'CONFIRMED') return 'Confirmada';
  if (status === 'CANCELLED') return 'Cancelada';
  if (status === 'COMPLETED') return 'Completada';
  if (status === 'NO_SHOW') return 'No asistio';
  return 'Pendiente';
};

const statusTone = (status: ClientDashboardBooking['status']) => {
  if (status === 'CONFIRMED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700';
  if (status === 'COMPLETED') return 'bg-slate-100 text-slate-700';
  if (status === 'NO_SHOW') return 'bg-amber-50 text-amber-700';
  return 'bg-amber-50 text-amber-700';
};

const paymentTypeLabel = (paymentType?: ClientDashboardBooking['paymentType'] | null) => {
  if (paymentType === 'FULL_PREPAY') return 'Pago total online';
  if (paymentType === 'DEPOSIT') return 'Sena online';
  if (paymentType === 'ON_SITE') return 'Pago en el local';
  return 'Pago a definir';
};

const financialStatusLabel = (financialStatus?: string | null) => {
  if (financialStatus === 'PAYMENT_PENDING') return 'Pago pendiente';
  if (financialStatus === 'HELD') return 'Fondos retenidos';
  if (financialStatus === 'REFUND_PENDING') return 'Refund pendiente';
  if (financialStatus === 'PARTIALLY_REFUNDED') return 'Refund parcial';
  if (financialStatus === 'REFUNDED') return 'Refund completo';
  if (financialStatus === 'RELEASE_PENDING') return 'Liberacion pendiente';
  if (financialStatus === 'PARTIALLY_RELEASED') return 'Liberacion parcial';
  if (financialStatus === 'RELEASED') return 'Liberado';
  if (financialStatus === 'FAILED') return 'Fallo';
  if (financialStatus === 'NOT_REQUIRED') return 'Sin cobro online';
  return 'Sin estado financiero';
};

const financialStatusTone = (financialStatus?: string | null) => {
  if (financialStatus === 'PAYMENT_PENDING' || financialStatus === 'REFUND_PENDING' || financialStatus === 'RELEASE_PENDING') {
    return 'bg-amber-50 text-amber-700';
  }
  if (financialStatus === 'FAILED') {
    return 'bg-red-50 text-red-700';
  }
  if (
    financialStatus === 'HELD'
    || financialStatus === 'PARTIALLY_REFUNDED'
    || financialStatus === 'REFUNDED'
    || financialStatus === 'PARTIALLY_RELEASED'
    || financialStatus === 'RELEASED'
  ) {
    return 'bg-emerald-50 text-emerald-700';
  }
  return 'bg-slate-100 text-slate-700';
};

const formatMoney = (amount?: number | null, currency?: string | null) => {
  if (typeof amount !== 'number') return null;

  try {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || '$'} ${amount}`;
  }
};

type BookingListCardProps = {
  booking: ClientDashboardBooking;
  isSelected: boolean;
  onPress: (bookingId: string) => void;
};

function BookingListCard({ booking, isSelected, onPress }: BookingListCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(booking.id)}
      className={`mt-3 rounded-[22px] border p-4 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-secondary/10 bg-white'
      }`}
      activeOpacity={0.9}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-secondary">{booking.service}</Text>
          <Text className="mt-1 text-sm text-gray-500">{booking.professional}</Text>
          <Text className="mt-2 text-xs text-gray-500">{booking.date} - {booking.time}</Text>
        </View>
        <StatusPill
          label={statusLabel(booking.status)}
          tone={
            booking.status === 'CONFIRMED'
              ? 'success'
              : booking.status === 'CANCELLED'
                ? 'danger'
                : booking.status === 'COMPLETED'
                  ? 'neutral'
                  : 'warning'
          }
        />
      </View>

      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        <View className="rounded-full border border-secondary/10 bg-background px-3 py-1">
          <Text className="text-[11px] font-semibold text-secondary">
            {paymentTypeLabel(booking.paymentType)}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${financialStatusTone(booking.financialSummary?.financialStatus)}`}>
          <Text className="text-[11px] font-semibold">
            {financialStatusLabel(booking.financialSummary?.financialStatus)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ClientBookingsScreen() {
  const { clientProfile, isAuthenticated } = useAuthSession();
  const [bookings, setBookings] = useState<ClientDashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingActions, setBookingActions] = useState<Awaited<ReturnType<typeof getBookingActions>> | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(toLocalDateKey(new Date()));
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadBookings = useCallback(async (options?: { showLoader?: boolean }) => {
    if (!isAuthenticated) {
      setBookings([]);
      setSelectedBookingId(null);
      setIsLoading(false);
      return;
    }

    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await getClientBookings();
      setBookings(response);
      setSelectedBookingId((current) => {
        if (current && response.some((booking) => booking.id === current)) return current;
        return response[0]?.id ?? null;
      });
    } catch (loadError) {
      setBookings([]);
      setError(getApiErrorMessage(loadError, 'No pudimos cargar tus reservas.'));
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !isAuthenticated) return;
      void loadBookings();
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, loadBookings]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBookings({ showLoader: false });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBookings]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );

  useEffect(() => {
    const loadActions = async () => {
      if (!selectedBooking?.id) {
        setBookingActions(null);
        return;
      }

      setIsLoadingActions(true);
      try {
        const next = await getBookingActions(selectedBooking.id);
        setBookingActions(next);
      } catch {
        setBookingActions(null);
      } finally {
        setIsLoadingActions(false);
      }
    };

    void loadActions();
  }, [selectedBooking?.id]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedBooking?.professionalSlug || !selectedBooking?.serviceId || !rescheduleDate) {
        setSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const response = await getPublicSlots(
          selectedBooking.professionalSlug,
          rescheduleDate,
          selectedBooking.serviceId,
        );
        setSlots(response);
        setSelectedSlot((current) => (current && response.includes(current) ? current : ''));
      } catch {
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [rescheduleDate, selectedBooking?.professionalSlug, selectedBooking?.serviceId]);

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

  const bookingStats = useMemo(() => ({
    upcoming: upcomingBookings.length,
    completed: bookings.filter((booking) => booking.status === 'COMPLETED').length,
    pendingPayment: bookings.filter(
      (booking) => booking.financialSummary?.financialStatus === 'PAYMENT_PENDING',
    ).length,
  }), [bookings, upcomingBookings.length]);

  if (!isAuthenticated) {
    return (
      <AppScreen
        scroll
        edges={['top']}
        refreshing={isRefreshing}
        onRefresh={() => {
          void handleRefresh();
        }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
      >
        <ScreenHero
          eyebrow="Reservas"
          title="Tus reservas viven en tu cuenta"
          description="Puedes explorar profesionales sin iniciar sesion, pero para ver tus reservas, pagos y cambios necesitas acceder con tu cuenta."
          icon="calendar-outline"
          badges={[{ label: 'Acceso privado', tone: 'warning' }]}
        />
        <AuthWall
          title="Inicia sesion para revisar tus reservas"
          description="Desde aqui podras ver proximos turnos, pagos pendientes, cancelaciones y reagendamientos asociados a tu cuenta."
          icon="calendar-outline"
        />
      </AppScreen>
    );
  }

  const handleCancel = async () => {
    if (!selectedBooking) return;
    Alert.alert('Cancelar reserva', 'Se cancelara tu reserva seleccionada.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Si, cancelar',
        style: 'destructive',
        onPress: async () => {
          setIsSubmitting(true);
          setMessage(null);
          try {
            const response = await cancelClientBooking(selectedBooking.id, cancelReason);
            setMessage(response.plainTextFallback || 'Reserva cancelada correctamente.');
            setCancelReason('');
            await loadBookings();
          } catch (cancelError) {
            setMessage(getApiErrorMessage(cancelError, 'No se pudo cancelar la reserva.'));
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !selectedSlot || !rescheduleDate) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await rescheduleClientBooking(
        selectedBooking.id,
        `${rescheduleDate}T${selectedSlot}:00`,
      );
      setMessage(response.plainTextFallback || 'Reserva reagendada correctamente.');
      setSelectedSlot('');
      await loadBookings();
    } catch (rescheduleError) {
      setMessage(getApiErrorMessage(rescheduleError, 'No se pudo reagendar la reserva.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCheckout = async () => {
    if (!selectedBooking) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      const session = await createClientBookingPaymentSession(selectedBooking.id);
      if (session.checkoutUrl) {
        await openMercadoPagoInAppBrowser(session.checkoutUrl);
        await loadBookings();
        setMessage('Mercado Pago se abrio dentro de la app y actualizamos tu reserva al volver.');
      } else {
        setMessage('El backend no devolvio URL de checkout para esta reserva.');
      }
    } catch (checkoutError) {
      setMessage(getApiErrorMessage(checkoutError, 'No se pudo abrir el checkout.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen
      scroll
      edges={['top']}
      refreshing={isRefreshing}
      onRefresh={() => {
        void handleRefresh();
      }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
    >
        <ScreenHero
          eyebrow="Reservas"
          title={clientProfile?.fullName ? `${clientProfile.fullName}, tus turnos` : 'Mis turnos'}
          description="Consulta el estado real de tu reserva, su pago y las acciones habilitadas."
          icon="calendar-outline"
          badges={[
            { label: `Proximas ${bookingStats.upcoming}`, tone: 'light' },
            { label: `Completadas ${bookingStats.completed}`, tone: 'light' },
            { label: `Pago pendiente ${bookingStats.pendingPayment}`, tone: 'light' },
          ]}
        />

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          <MessageCard message={error} tone="danger" style={{ marginTop: 20 }} />
        ) : null}

        {message ? (
          <MessageCard message={message} tone="primary" style={{ marginTop: 20 }} />
        ) : null}

        {!isLoading && upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <View className="mt-6">
            <EmptyState
              title="Todavia no tienes reservas"
              description="Cuando hagas la primera, aparecera aqui con su estado y acciones disponibles."
              icon="calendar-clear-outline"
            />
          </View>
        ) : null}

        {upcomingBookings.length > 0 ? (
          <View className="mt-6">
            <View className="flex-row items-end justify-between">
              <SectionHeader eyebrow="Proximas" title="Tus proximos turnos" />
              <Text className="text-sm font-semibold text-primary">{upcomingBookings.length}</Text>
            </View>

            {upcomingBookings.map((booking) => (
              <BookingListCard
                key={booking.id}
                booking={booking}
                isSelected={selectedBookingId === booking.id}
                onPress={setSelectedBookingId}
              />
            ))}
          </View>
        ) : null}

        {pastBookings.length > 0 ? (
          <View className="mt-8">
            <View className="flex-row items-end justify-between">
              <SectionHeader eyebrow="Historial" title="Reservas pasadas" />
              <Text className="text-sm font-semibold text-gray-500">{pastBookings.length}</Text>
            </View>

            {pastBookings.map((booking) => (
              <BookingListCard
                key={booking.id}
                booking={booking}
                isSelected={selectedBookingId === booking.id}
                onPress={setSelectedBookingId}
              />
            ))}
          </View>
        ) : null}

        {selectedBooking ? (
          <View className="mt-8 rounded-[24px] border border-secondary/10 bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                  Detalle de reserva
                </Text>
                <Text className="mt-2 text-2xl font-bold text-secondary">{selectedBooking.service}</Text>
                <Text className="mt-1 text-sm text-gray-500">{selectedBooking.professional}</Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${statusTone(selectedBooking.status)}`}>
                <Text className="text-[11px] font-bold">{statusLabel(selectedBooking.status)}</Text>
              </View>
            </View>

            <View className="mt-5 rounded-[20px] border border-secondary/10 bg-background p-4">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                <View className="rounded-full border border-secondary/10 bg-white px-3 py-1">
                  <Text className="text-[11px] font-semibold text-secondary">
                    {paymentTypeLabel(selectedBooking.paymentType)}
                  </Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${financialStatusTone(selectedBooking.financialSummary?.financialStatus)}`}>
                  <Text className="text-[11px] font-semibold">
                    {financialStatusLabel(selectedBooking.financialSummary?.financialStatus)}
                  </Text>
                </View>
              </View>

              <View className="mt-4" style={{ gap: 8 }}>
                <Text className="text-sm text-gray-500">
                  Fecha y hora:
                  <Text className="font-semibold text-secondary"> {selectedBooking.date} - {selectedBooking.time}</Text>
                </Text>
                <Text className="text-sm text-gray-500">
                  Ubicacion:
                  <Text className="font-semibold text-secondary"> {selectedBooking.location || 'A confirmar'}</Text>
                </Text>
                {selectedBooking.financialSummary?.amountHeld != null ? (
                  <Text className="text-sm text-gray-500">
                    Fondos retenidos:
                    <Text className="font-semibold text-secondary">
                      {' '}{formatMoney(
                        selectedBooking.financialSummary.amountHeld,
                        selectedBooking.financialSummary.currency,
                      )}
                    </Text>
                  </Text>
                ) : null}
                {selectedBooking.financialSummary?.amountRefunded != null ? (
                  <Text className="text-sm text-gray-500">
                    Refund:
                    <Text className="font-semibold text-secondary">
                      {' '}{formatMoney(
                        selectedBooking.financialSummary.amountRefunded,
                        selectedBooking.financialSummary.currency,
                      )}
                    </Text>
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="mt-5 rounded-[20px] border border-secondary/10 bg-white p-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Acciones disponibles</Text>

              {isLoadingActions ? (
                <View className="mt-4 items-center">
                  <ActivityIndicator color="#0A7A43" />
                </View>
              ) : (
                <>
                  <Text className="mt-3 text-sm leading-5 text-gray-500">
                    {bookingActions?.plainTextFallback || 'Selecciona una accion para continuar con esta reserva.'}
                  </Text>

                  {typeof bookingActions?.refundPreviewAmount === 'number' ? (
                    <View className="mt-3 rounded-xl bg-emerald-50 p-3">
                      <Text className="text-xs font-semibold text-emerald-700">
                        Preview refund: {formatMoney(bookingActions.refundPreviewAmount, bookingActions.currency)}
                      </Text>
                    </View>
                  ) : null}

                  {typeof bookingActions?.retainPreviewAmount === 'number' && bookingActions.retainPreviewAmount > 0 ? (
                    <View className="mt-3 rounded-xl bg-amber-50 p-3">
                      <Text className="text-xs font-semibold text-amber-700">
                        Retencion estimada: {formatMoney(bookingActions.retainPreviewAmount, bookingActions.currency)}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}

              {bookingActions?.canCancel ? (
                <>
                  <TextInput
                    className="mt-4 min-h-[88px] rounded-xl border border-secondary/10 bg-background px-3 py-3 text-secondary"
                    placeholder="Motivo de cancelacion (opcional)"
                    multiline
                    textAlignVertical="top"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                  />
                  <ActionButton
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    label="Cancelar reserva"
                    tone="danger"
                    onPress={() => void handleCancel()}
                    style={{ marginTop: 12 }}
                  />
                </>
              ) : null}

              {bookingActions?.canReschedule ? (
                <>
                  <TextInput
                    className="mt-4 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
                    placeholder="Fecha nueva YYYY-MM-DD"
                    value={rescheduleDate}
                    onChangeText={setRescheduleDate}
                  />

                  {isLoadingSlots ? (
                    <View className="mt-3 items-center">
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                      {slots.length === 0 ? (
                        <Text className="text-sm text-gray-500">No encontramos horarios para esa fecha.</Text>
                      ) : (
                        slots.map((slot) => (
                          <SelectionChip
                            key={slot}
                            label={slot}
                            selected={selectedSlot === slot}
                            tone="solid"
                            onPress={() => setSelectedSlot(slot)}
                          />
                        ))
                      )}
                    </View>
                  )}

                  <ActionButton
                    disabled={isSubmitting || !selectedSlot}
                    loading={isSubmitting}
                    label="Confirmar nuevo horario"
                    tone="primary"
                    onPress={() => void handleReschedule()}
                    style={{ marginTop: 12 }}
                  />
                </>
              ) : null}

              {selectedBooking.financialSummary?.financialStatus === 'PAYMENT_PENDING' ? (
                <ActionButton
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  label="Completar pago"
                  tone="primary"
                  onPress={() => void handleStartCheckout()}
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </View>
          </View>
        ) : null}
    </AppScreen>
  );
}
