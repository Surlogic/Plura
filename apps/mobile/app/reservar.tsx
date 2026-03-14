import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import {
  createPublicReservation,
  getPublicProfessionalBySlug,
  type PublicProfessionalService,
} from '../src/services/publicBookings';
import { getApiErrorMessage } from '../src/services/errors';
import {
  clearPendingReservation,
  savePendingReservation,
} from '../src/services/pendingReservation';
import { useProfessionalProfileContext } from '../src/context/ProfessionalProfileContext';

type Params = {
  slug?: string;
  serviceId?: string;
  date?: string;
  time?: string;
};

const formatDateLong = (value?: string) => {
  if (!value) return 'Fecha no seleccionada';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
};

const formatDuration = (value?: string) => {
  if (!value) return '45 min';
  return value;
};

const formatPrice = (value?: string) => {
  if (!value) return 'A confirmar';
  return value.includes('$') ? value : `$${value}`;
};

const buildStartDateTime = (date?: string, time?: string): string | null => {
  if (!date || !time) return null;
  const normalizedTime = time.trim();
  if (/^\d{2}:\d{2}$/.test(normalizedTime)) {
    return `${date}T${normalizedTime}:00`;
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(normalizedTime)) {
    return `${date}T${normalizedTime}`;
  }
  return null;
};

const isPrepaidService = (paymentType?: string) =>
  paymentType === 'DEPOSIT' || paymentType === 'FULL_PREPAY';

const resolveServiceCategoryLabel = (
  service: PublicProfessionalService | null,
  fallbackCategory?: string | null,
) => {
  const categoryName = service?.categoryName?.trim();
  if (categoryName) {
    return categoryName;
  }
  return fallbackCategory?.trim() || '';
};

export default function ReservationCheckoutScreen() {
  const { slug, serviceId, date, time } = useLocalSearchParams<Params>();
  const { hasLoaded, isAuthenticated, role } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [service, setService] = useState<PublicProfessionalService | null>(null);
  const [professionalName, setProfessionalName] = useState('Profesional');
  const [professionalCategory, setProfessionalCategory] = useState('Profesional');

  useEffect(() => {
    const load = async () => {
      if (!slug || !serviceId) {
        setMessage('Faltan datos para completar la reserva.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const professional = await getPublicProfessionalBySlug(slug);
        setProfessionalName(professional.fullName || 'Profesional');
        setProfessionalCategory(professional.rubro || 'Profesional');
        const selected = professional.services.find((item) => item.id === serviceId) || null;
        setService(selected);
        if (!selected) {
          setMessage('No encontramos el servicio seleccionado.');
        }
      } catch {
        setMessage('No pudimos cargar el checkout de reserva.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [serviceId, slug]);

  const canConfirm = useMemo(
    () => Boolean(slug && serviceId && date && time && service) && !isSaving && !isPrepaidService(service?.paymentType),
    [date, isSaving, service, serviceId, slug, time],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <LinearGradient
          colors={['#0B1D2A', '#145E63', '#1FB6A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-12 pb-10"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text className="mt-5 text-xs uppercase tracking-[2px] text-white/80">Checkout</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Confirmar reserva</Text>
          <Text className="mt-2 text-sm text-white/80">
            Revisa los detalles de tu turno antes de confirmar.
          </Text>
        </LinearGradient>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#1FB6A6" />
          </View>
        ) : (
          <View className="px-6 -mt-6">
            <View className="rounded-[28px] bg-white p-6 shadow-md border border-secondary/5">
              <Text className="text-xs uppercase tracking-[2px] text-gray-500">Resumen</Text>
              <Text className="mt-3 text-xl font-bold text-secondary">{service?.name || 'Servicio'}</Text>
              {resolveServiceCategoryLabel(service, professionalCategory) ? (
                <Text className="mt-1 text-sm text-gray-500">
                  {resolveServiceCategoryLabel(service, professionalCategory)}
                </Text>
              ) : null}
              <Text className="mt-1 text-sm text-gray-500">con {professionalName}</Text>

              <View className="mt-5 rounded-[18px] bg-background p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Fecha</Text>
                  <Text className="text-sm font-semibold text-secondary">{formatDateLong(date)}</Text>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Hora</Text>
                  <Text className="text-sm font-semibold text-secondary">{time || '-'}</Text>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Duracion</Text>
                  <Text className="text-sm font-semibold text-secondary">{formatDuration(service?.duration)}</Text>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Precio</Text>
                  <Text className="text-sm font-semibold text-primary">{formatPrice(service?.price)}</Text>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Pago</Text>
                  <Text className="text-sm font-semibold text-secondary">
                    {isPrepaidService(service?.paymentType) ? 'Requiere checkout' : 'En el lugar'}
                  </Text>
                </View>
              </View>

              {message ? (
                <View className="mt-4 rounded-xl bg-secondary/5 p-3">
                  <Text className="text-xs text-secondary">{message}</Text>
                </View>
              ) : null}

              {isPrepaidService(service?.paymentType) ? (
                <View className="mt-4 rounded-xl bg-secondary/5 p-3">
                  <Text className="text-xs text-secondary">
                    Este servicio requiere checkout online. La app mobile todavía no implementa ese flujo de pago de forma segura.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                disabled={!canConfirm}
                onPress={async () => {
                  if (!slug || !serviceId || !date || !time) return;

                  if (hasLoaded && !isAuthenticated) {
                    await savePendingReservation({
                      professionalSlug: slug,
                      serviceId,
                      date,
                      time,
                    });
                    setMessage('Necesitas iniciar sesion para confirmar. Redirigiendo...');
                    setTimeout(() => {
                      router.replace('/(auth)/login');
                    }, 500);
                    return;
                  }

                  if (role === 'professional') {
                    setMessage('Las reservas publicas solo pueden hacerse desde una cuenta cliente.');
                    return;
                  }

                  const startDateTime = buildStartDateTime(date, time);
                  if (!startDateTime) {
                    setMessage('El formato de hora seleccionado no es valido. Elegi otro horario.');
                    return;
                  }

                  setIsSaving(true);
                  setMessage(null);
                  try {
                    await createPublicReservation(slug, {
                      serviceId,
                      startDateTime,
                    });
                    await clearPendingReservation();
                    setMessage('Reserva confirmada. Te enviamos la notificacion en breve.');
                    setTimeout(() => {
                      router.replace('/(tabs)/dashboard');
                    }, 900);
                  } catch (error: unknown) {
                    if (isAxiosError(error) && error.response?.status === 401) {
                      await savePendingReservation({
                        professionalSlug: slug,
                        serviceId,
                        date,
                        time,
                      });
                      setMessage('Necesitas iniciar sesion para confirmar. Redirigiendo...');
                      setTimeout(() => {
                        router.replace('/(auth)/login');
                      }, 500);
                      return;
                    }
                    if (isAxiosError(error) && error.response?.status === 403) {
                      setMessage('Las reservas publicas solo pueden hacerse desde una cuenta cliente.');
                      return;
                    }
                    if (isAxiosError(error) && error.response?.status === 409) {
                      setMessage(getApiErrorMessage(error, 'Ese horario ya no esta disponible. Elegi otro.'));
                      return;
                    }
                    setMessage(getApiErrorMessage(error, 'No pudimos confirmar la reserva. Intenta nuevamente.'));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className={`mt-6 h-14 items-center justify-center rounded-full ${canConfirm ? 'bg-secondary' : 'bg-gray-300'}`}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-bold text-white">Confirmar turno</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
