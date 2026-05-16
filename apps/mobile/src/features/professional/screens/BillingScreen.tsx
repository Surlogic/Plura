import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { billingPlans } from '../../../config/billingPlans';
import {
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
} from '../../../services/billing';
import { useProfessionalSession } from '../session/useProfessionalSession';
import { openMercadoPagoInAppBrowser } from '../../../services/mercadoPagoBrowser';
import { AppScreen } from '../../../components/ui/AppScreen';
import { MessageCard, ScreenHero, SectionCard } from '../../../components/ui/MobileSurface';

export default function BillingScreen() {
  const { profile, refreshProfile } = useProfessionalSession();
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
    if (currentStatus === 'TRIALING') return 'Prueba gratuita';
    if (currentStatus === 'TRIAL') return subscription?.trialActive ? 'Prueba gratuita' : 'Pago pendiente';
    if (currentStatus === 'CHECKOUT_PENDING') return 'Activacion pendiente';
    if (currentStatus === 'PAST_DUE') return 'Pago fallido';
    if (currentStatus === 'CANCELLED') return 'Cancelada';
    if (currentStatus === 'EXPIRED') return 'Prueba vencida';
    return 'Sin suscripcion';
  }, [currentStatus, subscription?.trialActive]);
  const currentAmountLabel = useMemo(() => {
    if (currentPlanId === 'CORE') return currentPlan.priceLabel;
    return formatBillingAmount(subscription?.amount ?? currentPlan.priceMonthly, subscription?.currency || 'UYU');
  }, [currentPlan, currentPlanId, subscription]);

  useEffect(() => {
    if (!profile?.id || !subscription || subscription.status !== 'ACTIVE') {
      profileSyncSignatureRef.current = null;
      return;
    }

    if (currentPlanId === 'CORE' || canUseOnlinePayments) {
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
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 144 }}>
        <ScreenHero
          eyebrow="Facturacion"
          title="Core y cobros"
          description="Plura Core es la suscripcion unica del MVP para operar reservas, agenda, pagina publica y dashboard."
          icon="card-outline"
          badges={[
            { label: currentPlan.label, tone: 'light' },
            { label: currentStatusLabel, tone: 'light' },
          ]}
        />

        <SectionCard style={{ marginTop: 20 }}>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Estado</Text>
          <Text className="mt-2 text-lg font-bold text-secondary">Suscripcion: {currentPlan.label}</Text>
          <Text className="mt-1 text-sm text-gray-500">Estado: {currentStatusLabel}</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Monto: {currentAmountLabel}
          </Text>
        </SectionCard>

        <SectionCard style={{ marginTop: 20 }}>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Plura Core</Text>
          <Text className="mt-2 text-lg font-bold text-secondary">Incluido en el MVP</Text>
          {billingPlans[0].benefits.map((benefit) => (
            <Text key={benefit} className="mt-2 text-sm text-gray-500">• {benefit}</Text>
          ))}
        </SectionCard>

        <SectionCard style={{ marginTop: 20 }}>
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
                      await openMercadoPagoInAppBrowser(oauth.authorizationUrl);
                      await refreshProfile();
                      await loadBilling();
                      setMessage('Volviste de Mercado Pago. Refrescamos el estado de la conexion.');
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
              <Text className="mt-2 text-lg font-bold text-secondary">Cobros online proximamente</Text>
              <Text className="mt-1 text-sm text-gray-500">Esta funcionalidad todavia no esta disponible para esta cuenta.</Text>
              <Text className="mt-2 text-sm text-gray-500">
                No hay cambios de plan durante el MVP.
              </Text>
            </>
          )}
        </SectionCard>

        {message ? (
          <MessageCard message={message} tone="primary" style={{ marginTop: 16 }} />
        ) : null}
    </AppScreen>
  );
}
