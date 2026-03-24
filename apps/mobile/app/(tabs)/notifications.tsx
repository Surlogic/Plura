import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  buildClientNotifications,
  type MobileNotification,
} from '../../src/services/clientFeatures';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../src/components/ui/MobileSurface';
import { theme } from '../../src/theme';

export default function NotificationsScreen() {
  const { role } = useProfessionalProfileContext();
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
      const notifications = await buildClientNotifications();
      setItems(notifications);
      setIsLoading(false);
    };

    void load();
  }, []);

  if (role === 'professional') {
    return <Redirect href="/dashboard/notifications" />;
  }

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
    <AppScreen scroll edges={['top']} contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}>
      <ScreenHero
        eyebrow="Notificaciones"
        title="Tus alertas como cliente"
        description="Revisa recordatorios de reservas, promociones y novedades relevantes para tu cuenta."
        icon="notifications-outline"
        badges={[
          { label: `Push ${pushStatusLabel}`, tone: arePushNotificationsEnabled ? 'success' : 'warning' },
        ]}
      />

      <SectionCard style={{ marginTop: 24 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-bold text-secondary">Avisos push</Text>
            <Text className="mt-1 text-xs text-gray-500">
              Estado del dispositivo: {pushSettings.permissionStatus || 'pendiente'}
            </Text>
          </View>
          <StatusPill
            label={pushStatusLabel}
            tone={arePushNotificationsEnabled ? 'success' : 'warning'}
          />
        </View>

        {!arePushNotificationsEnabled ? (
          <ActionButton
            label={isRefreshingPushState ? 'Activando...' : 'Activar avisos'}
            onPress={requestPushPermission}
            disabled={isRefreshingPushState || isLoadingPushState}
            style={{ marginTop: 16 }}
          />
        ) : (
          <ActionButton
            label={isRefreshingPushState ? 'Actualizando...' : 'Desactivar en este dispositivo'}
            onPress={disablePush}
            disabled={isRefreshingPushState || isLoadingPushState}
            tone="secondary"
            style={{ marginTop: 16 }}
          />
        )}

        {pushSettings.permissionStatus === 'denied' ? (
          <TouchableOpacity onPress={openDeviceSettings} style={{ marginTop: 14 }}>
            <Text style={{ color: theme.colors.primaryStrong, fontWeight: '700' }}>
              Abrir configuracion del dispositivo
            </Text>
          </TouchableOpacity>
        ) : null}
      </SectionCard>

      <View style={{ gap: 12, marginTop: 20 }}>
        {isLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <SectionCard>
            <Text className="text-base font-bold text-secondary">Todavia no tienes alertas</Text>
            <Text className="mt-2 text-sm text-gray-500">
              Cuando confirmes una reserva o aparezca una promo relevante, la veras aqui.
            </Text>
          </SectionCard>
        ) : (
          items.map((item) => (
            <SectionCard key={item.id}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-bold text-secondary">{item.title}</Text>
                  <Text className="mt-2 text-sm text-gray-600">{item.body}</Text>
                  <Text className="mt-3 text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
                <StatusPill
                  label={item.type === 'promo' ? 'Promo' : item.type === 'booking' ? 'Reserva' : 'Info'}
                  tone={item.type === 'promo' ? 'primary' : item.type === 'booking' ? 'success' : 'neutral'}
                />
              </View>
            </SectionCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}