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

export default function ClientBookingsScreen() {
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
  }, []);

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
            await cancelClientBooking(selectedBooking.id, cancelReason);
            setMessage('Reserva cancelada correctamente.');
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
      await rescheduleClientBooking(
        selectedBooking.id,
        `${rescheduleDate}T${selectedSlot}:00`,
      );
      setMessage('Reserva reagendada correctamente.');
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
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Reservas</Text>
        <Text className="mt-2 text-3xl font-bold text-secondary">Mis turnos</Text>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#1FB6A6" />
          </View>
        ) : null}

        {error ? (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-xs text-red-600">{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View className="mt-4 rounded-xl border border-secondary/10 bg-white p-3">
            <Text className="text-xs text-secondary">{message}</Text>
          </View>
        ) : null}

        <Text className="mt-6 text-sm font-bold uppercase tracking-[2px] text-gray-500">Proximas</Text>
        {upcomingBookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            onPress={() => setSelectedBookingId(booking.id)}
            className={`mt-3 rounded-[20px] border p-4 ${selectedBookingId === booking.id ? 'border-primary bg-primary/5' : 'border-secondary/10 bg-white'}`}
          >
            <Text className="text-base font-bold text-secondary">{booking.service}</Text>
            <Text className="mt-1 text-sm text-gray-500">{booking.professional}</Text>
            <Text className="mt-1 text-xs text-gray-500">{booking.date} - {booking.time}</Text>
            <Text className="mt-2 text-xs font-semibold text-secondary">{statusLabel(booking.status)}</Text>
          </TouchableOpacity>
        ))}

        <Text className="mt-6 text-sm font-bold uppercase tracking-[2px] text-gray-500">Historial</Text>
        {pastBookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            onPress={() => setSelectedBookingId(booking.id)}
            className={`mt-3 rounded-[20px] border p-4 ${selectedBookingId === booking.id ? 'border-primary bg-primary/5' : 'border-secondary/10 bg-white'}`}
          >
            <Text className="text-base font-bold text-secondary">{booking.service}</Text>
            <Text className="mt-1 text-sm text-gray-500">{booking.professional}</Text>
            <Text className="mt-1 text-xs text-gray-500">{booking.date} - {booking.time}</Text>
            <Text className="mt-2 text-xs font-semibold text-secondary">{statusLabel(booking.status)}</Text>
          </TouchableOpacity>
        ))}

        {selectedBooking ? (
          <View className="mt-6 rounded-[22px] border border-secondary/10 bg-white p-5">
            <Text className="text-base font-bold text-secondary">Acciones de reserva</Text>
            <Text className="mt-1 text-xs text-gray-500">{selectedBooking.service} con {selectedBooking.professional}</Text>

            {isLoadingActions ? (
              <View className="mt-4 items-center">
                <ActivityIndicator color="#1FB6A6" />
              </View>
            ) : null}

            <TextInput
              className="mt-4 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
              placeholder="Motivo de cancelacion (opcional)"
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            {bookingActions?.canCancel ? (
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => void handleCancel()}
                className="mt-3 h-11 items-center justify-center rounded-full bg-red-600"
              >
                <Text className="font-bold text-white">Cancelar reserva</Text>
              </TouchableOpacity>
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
                    <ActivityIndicator color="#1FB6A6" />
                  </View>
                ) : (
                  <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                    {slots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        onPress={() => setSelectedSlot(slot)}
                        className={`rounded-full px-4 py-2 ${selectedSlot === slot ? 'bg-secondary' : 'bg-background border border-secondary/10'}`}
                      >
                        <Text className={`${selectedSlot === slot ? 'text-white' : 'text-secondary'} font-semibold text-xs`}>{slot}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  disabled={isSubmitting || !selectedSlot}
                  onPress={() => void handleReschedule()}
                  className={`mt-3 h-11 items-center justify-center rounded-full ${selectedSlot ? 'bg-secondary' : 'bg-gray-300'}`}
                >
                  <Text className="font-bold text-white">Reagendar</Text>
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
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
