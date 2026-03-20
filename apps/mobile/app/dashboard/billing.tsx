import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { billingPlans, type PaidBillingUiPlanId } from '../../src/config/billingPlans';
import {
  cancelBillingSubscription,
  createBillingCheckout,
  disconnectProfessionalMercadoPagoConnection,
  fetchCurrentSubscription,
  formatMercadoPagoConnectionDate,
  formatBillingAmount,
  getMercadoPagoConnectionStatusCopy,
  getProfessionalMercadoPagoConnection,
  resolveBackendMessage,
  resolveCurrentBillingPlanId,
  resolveCurrentBillingStatus,
  startProfessionalMercadoPagoOAuth,
  type ProfessionalMercadoPagoConnection,
} from '../../src/services/billing';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function BillingScreen() {
  const { profile, refreshProfile } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchCurrentSubscription>>>(null);
  const [connection, setConnection] = useState<ProfessionalMercadoPagoConnection | null>(null);
  const profileSyncSignatureRef = useRef<string | null>(null);

  const loadBilling = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const nextSubscription = await fetchCurrentSubscription();
      const nextConnection = profile?.professionalEntitlements?.allowOnlinePayments
        ? await getProfessionalMercadoPagoConnection()
        : null;
      setSubscription(nextSubscription);
      setConnection(nextConnection);
    } catch (error) {
      setMessage(resolveBackendMessage(error, 'No se pudo cargar la facturacion.'));
    } finally {
      setIsLoading(false);
    }
  }, [profile?.professionalEntitlements?.allowOnlinePayments]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const currentPlanId = useMemo(
    () => resolveCurrentBillingPlanId({ profilePlanCode: profile?.professionalPlan, subscription }),
    [profile?.professionalPlan, subscription],
  );
  const currentPlan = useMemo(
    () => billingPlans.find((plan) => plan.id === currentPlanId) ?? billingPlans[0],
    [currentPlanId],
  );
  const currentStatus = useMemo(() => resolveCurrentBillingStatus(subscription), [subscription]);
  const canUseOnlinePayments = Boolean(profile?.professionalEntitlements?.allowOnlinePayments);
  const connectionCopy = useMemo(
    () => getMercadoPagoConnectionStatusCopy(connection),
    [connection],
  );
  const currentStatusLabel = useMemo(() => {
    if (currentStatus === 'ACTIVE') return 'Activa';
    if (currentStatus === 'TRIAL') return 'Pago pendiente';
    if (currentStatus === 'PAST_DUE') return 'Pago fallido';
    if (currentStatus === 'CANCELLED') return 'Cancelada';
    return 'Sin suscripcion';
  }, [currentStatus]);
  const currentAmountLabel = useMemo(() => {
    if (currentPlanId === 'BASIC') return currentPlan.priceLabel;
    return formatBillingAmount(subscription?.amount ?? currentPlan.priceMonthly, subscription?.currency || 'UYU');
  }, [currentPlan, currentPlanId, subscription]);

  useEffect(() => {
    if (!profile?.id || !subscription || subscription.status !== 'ACTIVE') {
      profileSyncSignatureRef.current = null;
      return;
    }

    if (currentPlanId === 'BASIC' || canUseOnlinePayments) {
      profileSyncSignatureRef.current = null;
      return;
    }

    const signature = `${profile.id}:${subscription.subscriptionId}:${subscription.status}:${subscription.planCode}`;
    if (profileSyncSignatureRef.current === signature) {
      return;
    }

    profileSyncSignatureRef.current = signature;
    void (async () => {
      await refreshProfile();
      await loadBilling();
    })();
  }, [
    canUseOnlinePayments,
    currentPlanId,
    loadBilling,
    profile?.id,
    refreshProfile,
    subscription,
  ]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      void (async () => {
        await refreshProfile();
        await loadBilling();
      })();
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [loadBilling, refreshProfile]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#0A7A43" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <Text className="text-3xl font-bold text-secondary">Facturacion</Text>
        <Text className="mt-2 text-sm text-gray-500">Plan profesional y configuracion de cobros.</Text>

        <View className="mt-5 rounded-[22px] border border-secondary/10 bg-white p-5">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Estado</Text>
          <Text className="mt-2 text-lg font-bold text-secondary">Plan actual: {currentPlan.label}</Text>
          <Text className="mt-1 text-sm text-gray-500">Estado: {currentStatusLabel}</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Monto: {currentAmountLabel}
          </Text>
        </View>

        <View className="mt-5 rounded-[22px] border border-secondary/10 bg-white p-5">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Planes</Text>

          {billingPlans.map((plan) => (
            <View key={plan.id} className="mt-4 rounded-xl border border-secondary/10 p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-secondary">{plan.label}</Text>
                {plan.recommended ? (
                  <Text className="text-[10px] font-bold text-primary">RECOMENDADO</Text>
                ) : null}
              </View>
              <Text className="mt-1 text-sm text-gray-500">{plan.priceLabel}</Text>
              <Text className="mt-2 text-xs text-gray-500">{plan.benefits.join(' • ')}</Text>

              {plan.id !== 'BASIC' ? (
                <TouchableOpacity
                  disabled={isSubmitting || (currentPlanId === plan.id && currentStatus === 'ACTIVE')}
                  onPress={async () => {
                    setIsSubmitting(true);
                    setMessage(null);
                    try {
                      const checkout = await createBillingCheckout(plan.id as PaidBillingUiPlanId);
                      await Linking.openURL(checkout.checkoutUrl);
                      setMessage('Checkout abierto. Cuando vuelvas a la app vamos a refrescar el estado.');
                    } catch (error) {
                      setMessage(resolveBackendMessage(error, 'No se pudo iniciar checkout.'));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className={`mt-3 h-11 items-center justify-center rounded-full ${
                    currentPlanId === plan.id && currentStatus === 'ACTIVE' ? 'bg-gray-300' : 'bg-secondary'
                  }`}
                >
                  <Text className="font-bold text-white">
                    {currentPlanId === plan.id && currentStatus === 'ACTIVE' ? 'Plan actual' : `Elegir ${plan.label}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {subscription && currentPlanId !== 'BASIC' && currentStatus !== 'CANCELLED' && !subscription.cancelAtPeriodEnd ? (
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={async () => {
                setIsSubmitting(true);
                setMessage(null);
                try {
                  await cancelBillingSubscription();
                  setMessage('Cancelacion programada al final del periodo.');
                  await refreshProfile();
                  await loadBilling();
                } catch (error) {
                  setMessage(resolveBackendMessage(error, 'No se pudo cancelar la suscripcion.'));
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="mt-4 h-11 items-center justify-center rounded-full border border-red-200 bg-red-50"
            >
              <Text className="font-bold text-red-600">Cancelar suscripcion</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="mt-5 rounded-[22px] border border-secondary/10 bg-white p-5">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">
            Cobros de reservas con Mercado Pago
          </Text>
          {canUseOnlinePayments ? (
            <>
              <Text className="mt-2 text-lg font-bold text-secondary">{connectionCopy.badge}</Text>
              <Text className="mt-1 text-sm text-gray-500">{connectionCopy.title}</Text>
              <Text className="mt-2 text-sm text-gray-500">{connectionCopy.description}</Text>
              <Text className="mt-3 text-xs text-gray-500">
                Ultima sincronizacion: {formatMercadoPagoConnectionDate(connection?.lastSyncAt)}
              </Text>
              <Text className="mt-1 text-xs text-gray-500">
                Conectado desde: {formatMercadoPagoConnectionDate(connection?.connectedAt)}
              </Text>

              {!connection?.connected ? (
                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={async () => {
                    setIsSubmitting(true);
                    setMessage(null);
                    try {
                      const oauth = await startProfessionalMercadoPagoOAuth();
                      if (!oauth.authorizationUrl) {
                        throw new Error('No se recibio URL de autorizacion.');
                      }
                      await Linking.openURL(oauth.authorizationUrl);
                      setMessage('Se abrio Mercado Pago para completar la autorizacion.');
                    } catch (error) {
                      setMessage(resolveBackendMessage(error, 'No se pudo iniciar la conexion con Mercado Pago.'));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="mt-4 h-11 items-center justify-center rounded-full bg-secondary"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-bold text-white">Conectar Mercado Pago</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={async () => {
                    setIsSubmitting(true);
                    setMessage(null);
                    try {
                      const nextConnection = await disconnectProfessionalMercadoPagoConnection();
                      setConnection(nextConnection);
                      setMessage('Cuenta de Mercado Pago desconectada.');
                      await refreshProfile();
                    } catch (error) {
                      setMessage(resolveBackendMessage(error, 'No se pudo desconectar Mercado Pago.'));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="mt-4 h-11 items-center justify-center rounded-full border border-red-200 bg-red-50"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#DC2626" />
                  ) : (
                    <Text className="font-bold text-red-600">Desconectar cuenta</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text className="mt-2 text-lg font-bold text-secondary">Disponible desde PROFESIONAL</Text>
              <Text className="mt-1 text-sm text-gray-500">Tu plan actual no habilita cobros online.</Text>
              <Text className="mt-2 text-sm text-gray-500">
                Cuando subas de plan vas a poder conectar tu cuenta de Mercado Pago y cobrar reservas online desde Plura.
              </Text>
            </>
          )}
        </View>

        {message ? (
          <View className="mt-4 rounded-xl border border-secondary/10 bg-white p-3">
            <Text className="text-xs text-secondary">{message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
