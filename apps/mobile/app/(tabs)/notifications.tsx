import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  buildClientNotifications,
  type MobileNotification,
} from '../../src/services/clientFeatures';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

export default function NotificationsScreen() {
  const { role, profile } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MobileNotification[]>([]);
  const {
    settings: pushSettings,
    isLoading: isLoadingPushState,
    isRefreshing: isRefreshingPushState,
    isEnabled: arePushNotificationsEnabled,
    requestPermission: requestPushPermission,
    disablePush,
  } = usePushNotifications();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const notifications = role === 'professional'
        ? [
            {
              id: 'professional-panel',
              title: 'Panel profesional activo',
              body: 'Tus accesos mobile ahora quedaron separados del flujo cliente.',
              type: 'system' as const,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'professional-email',
              title: profile?.emailVerified ? 'Email verificado' : 'Verifica tu email',
              body: profile?.emailVerified
                ? 'Tu cuenta ya esta lista para notificaciones y recuperacion.'
                : 'Confirma tu email desde Cuenta para mejorar seguridad y recuperacion.',
              type: 'system' as const,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'professional-plan',
              title: `Plan ${profile?.professionalPlan || 'BASIC'}`,
              body: 'Revisa Facturacion para gestionar tu plan y los datos de cobro.',
              type: 'system' as const,
              createdAt: new Date().toISOString(),
            },
          ]
        : await buildClientNotifications();
      setItems(notifications);
      setIsLoading(false);
    };

    void load();
  }, [profile?.emailVerified, profile?.professionalPlan, role]);

  const openDeviceSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Ignore settings handoff failures on unsupported platforms.
    }
  };

  const pushStatusLabel = arePushNotificationsEnabled
    ? 'Activas'
    : pushSettings.permissionStatus === 'denied'
      ? 'Bloqueadas'
      : 'Pendientes';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Actividad</Text>
        <Text className="mt-2 text-3xl font-bold text-secondary">Notificaciones</Text>
        <Text className="mt-2 text-sm text-gray-500">
          {role === 'professional'
            ? 'Alertas del panel profesional y estado de la cuenta.'
            : 'Recordatorios y novedades de tu cuenta.'}
        </Text>

        <View className="mt-6 rounded-[24px] border border-secondary/10 bg-white p-5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
                Permiso del dispositivo
              </Text>
              <Text className="mt-2 text-xl font-bold text-secondary">
                Notificaciones {pushStatusLabel.toLowerCase()}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-gray-500">
                Cuando esten activas podremos usar este canal para reservas confirmadas, cancelaciones, recordatorios y promos.
              </Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${
              arePushNotificationsEnabled
                ? 'bg-emerald-50'
                : pushSettings.permissionStatus === 'denied'
                  ? 'bg-amber-50'
                  : 'bg-slate-100'
            }`}>
              <Text className={`text-xs font-bold ${
                arePushNotificationsEnabled
                  ? 'text-emerald-700'
                  : pushSettings.permissionStatus === 'denied'
                    ? 'text-amber-700'
                    : 'text-slate-700'
              }`}>
                {pushStatusLabel}
              </Text>
            </View>
          </View>

          {isLoadingPushState ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color="#0A7A43" />
            </View>
          ) : (
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              {arePushNotificationsEnabled ? (
                <TouchableOpacity
                  onPress={() => void disablePush()}
                  className="flex-1 items-center justify-center rounded-full border border-secondary/10 bg-background px-4 py-3"
                >
                  <Text className="text-sm font-bold text-secondary">
                    {isRefreshingPushState ? 'Guardando...' : 'Silenciar en app'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => void requestPushPermission()}
                  className="flex-1 items-center justify-center rounded-full bg-secondary px-4 py-3"
                >
                  <Text className="text-sm font-bold text-white">
                    {isRefreshingPushState ? 'Activando...' : 'Activar notificaciones'}
                  </Text>
                </TouchableOpacity>
              )}

              {pushSettings.permissionStatus === 'denied' && !pushSettings.canAskAgain ? (
                <TouchableOpacity
                  onPress={() => void openDeviceSettings()}
                  className="flex-1 items-center justify-center rounded-full border border-secondary/10 bg-white px-4 py-3"
                >
                  <Text className="text-sm font-bold text-secondary">Abrir ajustes</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#0A7A43" />
          </View>
        ) : null}

        {!isLoading && items.map((item) => (
          <View
            key={item.id}
            className="mt-4 rounded-[22px] border border-secondary/10 bg-white p-5 shadow-sm"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${item.type === 'booking' ? 'bg-primary/15' : 'bg-secondary/10'}`}>
                  <Ionicons
                    name={item.type === 'booking' ? 'calendar-outline' : 'sparkles-outline'}
                    size={18}
                    color={item.type === 'booking' ? '#0A7A43' : '#0F172A'}
                  />
                </View>
                <Text className="ml-3 text-sm font-bold text-secondary">{item.title}</Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-gray-500 leading-5">{item.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
