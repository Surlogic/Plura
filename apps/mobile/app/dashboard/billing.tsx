import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { billingPlans, type PaidBillingUiPlanId } from '../../src/config/billingPlans';
import {
  cancelBillingSubscription,
  createBillingCheckout,
  fetchCurrentSubscription,
  formatBillingAmount,
  getProfessionalPayoutConfig,
  resolveBackendMessage,
  resolveCurrentBillingPlanId,
  resolveCurrentBillingStatus,
  updateProfessionalPayoutConfig,
} from '../../src/services/billing';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import type { ProfessionalPayoutConfigUpdateInput } from '../../src/types/payout';

const emptyPayoutForm: ProfessionalPayoutConfigUpdateInput = {
  firstName: '',
  lastName: '',
  country: '',
  documentType: '',
  documentNumber: '',
  phone: '',
  bank: '',
  accountNumber: '',
  accountType: '',
  branch: '',
};

export default function BillingScreen() {
  const { profile, refreshProfile } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof fetchCurrentSubscription>>>(null);
  const [payoutForm, setPayoutForm] = useState<ProfessionalPayoutConfigUpdateInput>(emptyPayoutForm);

  const loadBilling = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [nextSubscription, payoutConfig] = await Promise.all([
        fetchCurrentSubscription(),
        getProfessionalPayoutConfig(),
      ]);
      setSubscription(nextSubscription);
      setPayoutForm({
        firstName: payoutConfig.firstName || '',
        lastName: payoutConfig.lastName || '',
        country: payoutConfig.country || '',
        documentType: payoutConfig.documentType || '',
        documentNumber: payoutConfig.documentNumber || '',
        phone: payoutConfig.phone || '',
        bank: payoutConfig.bank || '',
        accountNumber: payoutConfig.accountNumber || '',
        accountType: payoutConfig.accountType || '',
        branch: payoutConfig.branch || '',
      });
    } catch (error) {
      setMessage(resolveBackendMessage(error, 'No se pudo cargar la facturacion.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBilling();
  }, []);

  const currentPlanId = useMemo(
    () => resolveCurrentBillingPlanId({ profilePlanCode: profile?.professionalPlan, subscription }),
    [profile?.professionalPlan, subscription],
  );
  const currentStatus = useMemo(() => resolveCurrentBillingStatus(subscription), [subscription]);

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
          <Text className="mt-2 text-lg font-bold text-secondary">Plan actual: {currentPlanId}</Text>
          <Text className="mt-1 text-sm text-gray-500">Estado: {currentStatus}</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Monto: {formatBillingAmount(subscription?.amount ?? null, subscription?.currency)}
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
                  disabled={isSubmitting}
                  onPress={async () => {
                    setIsSubmitting(true);
                    setMessage(null);
                    try {
                      const checkout = await createBillingCheckout(plan.id as PaidBillingUiPlanId);
                      await Linking.openURL(checkout.checkoutUrl);
                      setMessage('Checkout abierto. Luego vuelve para refrescar estado.');
                    } catch (error) {
                      setMessage(resolveBackendMessage(error, 'No se pudo iniciar checkout.'));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="mt-3 h-11 items-center justify-center rounded-full bg-secondary"
                >
                  <Text className="font-bold text-white">Elegir {plan.label}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

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
        </View>

        <View className="mt-5 rounded-[22px] border border-secondary/10 bg-white p-5">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gray-500">Cobros (Payout)</Text>

          {(
            [
              ['firstName', 'Nombre'],
              ['lastName', 'Apellido'],
              ['country', 'Pais'],
              ['documentType', 'Tipo documento'],
              ['documentNumber', 'Numero documento'],
              ['phone', 'Telefono'],
              ['bank', 'Banco'],
              ['accountNumber', 'Numero cuenta'],
              ['accountType', 'Tipo cuenta'],
              ['branch', 'Sucursal'],
            ] as Array<[keyof ProfessionalPayoutConfigUpdateInput, string]>
          ).map(([key, label]) => (
            <TextInput
              key={key}
              className="mt-3 h-11 rounded-xl border border-secondary/10 bg-background px-3 text-secondary"
              placeholder={label}
              value={payoutForm[key]}
              onChangeText={(value) =>
                setPayoutForm((prev) => ({
                  ...prev,
                  [key]: value,
                }))
              }
            />
          ))}

          <TouchableOpacity
            disabled={isSubmitting}
            onPress={async () => {
              setIsSubmitting(true);
              setMessage(null);
              try {
                await updateProfessionalPayoutConfig(payoutForm);
                setMessage('Configuracion de cobro guardada.');
                await refreshProfile();
              } catch (error) {
                setMessage(resolveBackendMessage(error, 'No se pudo guardar payout config.'));
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="mt-4 h-11 items-center justify-center rounded-full bg-secondary"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-white">Guardar datos de cobro</Text>
            )}
          </TouchableOpacity>
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
