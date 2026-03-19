import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  cancelClientBooking,
  createClientBookingPaymentSession,
  getBookingActions,
  getClientBookings,
  rescheduleClientBooking,
  type ClientDashboardBooking,
} from '../../src/services/clientBookings';
import { getPublicSlots } from '../../src/services/publicBookings';
import { getApiErrorMessage } from '../../src/services/errors';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import BusinessProfileScreen from '../dashboard/business-profile';
import { theme } from '../../src/theme';

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
        <View className={`rounded-full px-3 py-1 ${statusTone(booking.status)}`}>
          <Text className="text-[11px] font-bold">{statusLabel(booking.status)}</Text>
        </View>
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
  const { role, profile, clientProfile } = useProfessionalProfileContext();
  const [bookings, setBookings] = useState<ClientDashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadBookings = async () => {
    if (role === 'professional') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [role]);

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

  if (role === 'professional' && profile) {
    return <BusinessProfileScreen />;
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
        await Linking.openURL(session.checkoutUrl);
        setMessage('Checkout abierto en tu navegador.');
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <LinearGradient
          colors={theme.gradients.heroElevated}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[28px] p-6"
        >
          <Text className="text-xs font-bold uppercase tracking-[2px] text-white/75">Reservas</Text>
          <Text className="mt-2 text-3xl font-bold text-white">
            {clientProfile?.fullName ? `${clientProfile.fullName}, tus turnos` : 'Mis turnos'}
          </Text>
          <Text className="mt-2 text-sm text-white/80">
            Consulta el estado real de tu reserva, su pago y las acciones habilitadas.
          </Text>

          <View className="mt-6 flex-row flex-wrap" style={{ gap: 10 }}>
            <View className="rounded-full bg-white/15 px-4 py-2">
              <Text className="text-xs font-semibold text-white">
                Proximas {bookingStats.upcoming}
              </Text>
            </View>
            <View className="rounded-full bg-white/15 px-4 py-2">
              <Text className="text-xs font-semibold text-white">
                Completadas {bookingStats.completed}
              </Text>
            </View>
            <View className="rounded-full bg-white/15 px-4 py-2">
              <Text className="text-xs font-semibold text-white">
                Pago pendiente {bookingStats.pendingPayment}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          <View className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-xs text-red-600">{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View className="mt-5 rounded-xl border border-secondary/10 bg-white p-3">
            <Text className="text-xs text-secondary">{message}</Text>
          </View>
        ) : null}

        {!isLoading && upcomingBookings.length === 0 && pastBookings.length === 0 ? (
          <View className="mt-6 rounded-[24px] border border-dashed border-secondary/15 bg-white p-6">
            <Text className="text-center text-sm text-gray-500">
              Todavia no tienes reservas. Cuando hagas la primera, aparecera aqui con su estado y acciones.
            </Text>
          </View>
        ) : null}

        {upcomingBookings.length > 0 ? (
          <View className="mt-6">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Proximas</Text>
                <Text className="mt-1 text-xl font-bold text-secondary">Tus proximos turnos</Text>
              </View>
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
              <View>
                <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Historial</Text>
                <Text className="mt-1 text-xl font-bold text-secondary">Reservas pasadas</Text>
              </View>
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
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={() => void handleCancel()}
                    className="mt-3 h-11 items-center justify-center rounded-full bg-red-600"
                  >
                    <Text className="font-bold text-white">Cancelar reserva</Text>
                  </TouchableOpacity>
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
                          <TouchableOpacity
                            key={slot}
                            onPress={() => setSelectedSlot(slot)}
                            className={`rounded-full px-4 py-2 ${
                              selectedSlot === slot ? 'bg-secondary' : 'border border-secondary/10 bg-background'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${selectedSlot === slot ? 'text-white' : 'text-secondary'}`}>
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    disabled={isSubmitting || !selectedSlot}
                    onPress={() => void handleReschedule()}
                    className={`mt-3 h-11 items-center justify-center rounded-full ${selectedSlot ? 'bg-secondary' : 'bg-gray-300'}`}
                  >
                    <Text className="font-bold text-white">Confirmar nuevo horario</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {selectedBooking.financialSummary?.financialStatus === 'PAYMENT_PENDING' ? (
                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={() => void handleStartCheckout()}
                  className="mt-3 h-11 items-center justify-center rounded-full bg-primary"
                >
                  <Text className="font-bold text-white">Completar pago</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
