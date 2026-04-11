import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '../src/lib/icons';
import { isAxiosError } from 'axios';
import { createClientBookingPaymentSession } from '../src/services/clientBookings';
import {
  createPublicReservation,
  getPublicProfessionalBySlug,
  type PublicProfessionalService,
} from '../src/services/publicBookings';
import { getApiErrorMessage } from '../src/services/errors';
import { trackProductAnalyticsEvent } from '../src/services/productAnalytics';
import {
  clearPendingReservation,
  savePendingReservation,
} from '../src/services/pendingReservation';
import { useAuthSession } from '../src/context/auth/AuthSessionContext';
import { openMercadoPagoInAppBrowser } from '../src/services/mercadoPagoBrowser';
import { theme } from '../src/theme';
import { CLIENT_LOGIN_ROUTE } from '../src/features/shared/auth/routes';

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
  const { hasLoaded, isAuthenticated, role } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [service, setService] = useState<PublicProfessionalService | null>(null);
  const [professionalId, setProfessionalId] = useState<number | null>(null);
  const [professionalName, setProfessionalName] = useState('Profesional');
  const [professionalCategory, setProfessionalCategory] = useState('Profesional');
  const [professionalCity, setProfessionalCity] = useState<string | null>(null);
  const [professionalCountry, setProfessionalCountry] = useState<string | null>(null);

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
        const parsedProfessionalId = Number.parseInt(professional.id, 10);
        setProfessionalId(Number.isFinite(parsedProfessionalId) ? parsedProfessionalId : null);
        setProfessionalName(professional.fullName || 'Profesional');
        setProfessionalCategory(professional.rubro || 'Profesional');
        setProfessionalCity(professional.city || null);
        setProfessionalCountry(professional.country || null);
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

  useEffect(() => {
    if (!slug || !serviceId) return;
    void trackProductAnalyticsEvent({
      eventKey: 'RESERVATION_STEP_VIEWED',
      sourceSurface: 'reservation_flow_mobile',
      stepName: 'confirm',
      professionalId,
      professionalSlug: slug,
      professionalRubro: professionalCategory,
      categorySlug: service?.categorySlug ?? null,
      categoryLabel: resolveServiceCategoryLabel(service, professionalCategory) || null,
      serviceId,
      city: professionalCity,
      country: professionalCountry,
      metadata: {
        entrySurface: 'mobile_checkout',
        requiresCheckout: isPrepaidService(service?.paymentType),
      },
    });
  }, [
    professionalCategory,
    professionalCity,
    professionalCountry,
    professionalId,
    service?.categorySlug,
    service?.categoryName,
    service?.paymentType,
    service,
    serviceId,
    slug,
  ]);

  const canConfirm = useMemo(
    () => Boolean(slug && serviceId && date && time && service) && !isSaving,
    [date, isSaving, service, serviceId, slug, time],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <LinearGradient
          colors={theme.gradients.hero}
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
            <ActivityIndicator color={theme.colors.primary} />
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

              <View className="mt-4 rounded-xl bg-secondary/5 p-3">
                <Text className="text-xs text-secondary">
                  {isPrepaidService(service?.paymentType)
                    ? 'Si confirmas este turno, vamos a crear la reserva y abrir Mercado Pago para completar el checkout.'
                    : 'Si confirmas este turno, la reserva quedara registrada y podras seguirla desde Mis turnos.'}
                </Text>
              </View>

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
                      router.replace(CLIENT_LOGIN_ROUTE);
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
                  void trackProductAnalyticsEvent({
                    eventKey: 'RESERVATION_SUBMIT_ATTEMPTED',
                    sourceSurface: 'reservation_flow_mobile',
                    stepName: 'confirm',
                    professionalId,
                    professionalSlug: slug,
                    professionalRubro: professionalCategory,
                    categorySlug: service?.categorySlug ?? null,
                    categoryLabel: resolveServiceCategoryLabel(service, professionalCategory) || null,
                    serviceId,
                    city: professionalCity,
                    country: professionalCountry,
                    metadata: {
                      selectedDate: date,
                      selectedTime: time,
                      requiresCheckout: isPrepaidService(service?.paymentType),
                    },
                  });
                  try {
                    const created = await createPublicReservation(slug, {
                      serviceId,
                      startDateTime,
                    });
                    await clearPendingReservation();

                    if (isPrepaidService(service?.paymentType)) {
                      try {
                        const paymentSession = await createClientBookingPaymentSession(String(created.id));
                        if (paymentSession.checkoutUrl) {
                          await openMercadoPagoInAppBrowser(paymentSession.checkoutUrl);
                          setMessage('Reserva creada. Revisaremos el estado del pago en Mis turnos.');
                        } else {
                          setMessage('Reserva creada. Revisa el estado del pago en Mis turnos.');
                        }
                      } catch (paymentError) {
                        setMessage(getApiErrorMessage(paymentError, 'Reserva creada, pero no pudimos abrir el checkout.'));
                      } finally {
                        router.replace('/(tabs)/bookings');
                      }
                      return;
                    }

                    setMessage('Reserva confirmada. Te llevamos a Mis turnos.');
                    setTimeout(() => {
                      router.replace('/(tabs)/bookings');
                    }, 900);
                  } catch (error: unknown) {
                    if (isAxiosError(error) && error.response?.status === 401) {
                      void trackProductAnalyticsEvent({
                        eventKey: 'RESERVATION_AUTH_OPENED',
                        sourceSurface: 'reservation_flow_mobile',
                        stepName: 'confirm',
                        professionalId,
                        professionalSlug: slug,
                        professionalRubro: professionalCategory,
                        categorySlug: service?.categorySlug ?? null,
                        categoryLabel: resolveServiceCategoryLabel(service, professionalCategory) || null,
                        serviceId,
                        city: professionalCity,
                        country: professionalCountry,
                        metadata: {
                          reason: 'missing_client_session',
                          redirectTarget: CLIENT_LOGIN_ROUTE,
                        },
                      });
                      await savePendingReservation({
                        professionalSlug: slug,
                        serviceId,
                        date,
                        time,
                      });
                      setMessage('Necesitas iniciar sesion para confirmar. Redirigiendo...');
                      setTimeout(() => {
                        router.replace(CLIENT_LOGIN_ROUTE);
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
                  <Text className="text-base font-bold text-white">
                    {isPrepaidService(service?.paymentType) ? 'Reservar y abrir checkout' : 'Confirmar turno'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
