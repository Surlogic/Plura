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
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../src/components/ui/MobileSurface';
import { theme } from '../../src/theme';

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
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <ScreenHero
          eyebrow="Actividad"
          title="Notificaciones"
          description={
            role === 'professional'
              ? 'Alertas del panel profesional y estado de la cuenta.'
              : 'Recordatorios y novedades de tu cuenta.'
          }
          icon="notifications-outline"
          badges={[{ label: `${items.length} items`, tone: 'light' }]}
        />

        <SectionCard style={{ marginTop: 24 }}>
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
            <StatusPill
              label={pushStatusLabel}
              tone={
                arePushNotificationsEnabled
                  ? 'success'
                  : pushSettings.permissionStatus === 'denied'
                    ? 'warning'
                    : 'neutral'
              }
            />
          </View>

          {isLoadingPushState ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              {arePushNotificationsEnabled ? (
                <ActionButton
                  onPress={() => void disablePush()}
                  label={isRefreshingPushState ? 'Guardando...' : 'Silenciar en app'}
                  tone="soft"
                  style={{ flex: 1 }}
                />
              ) : (
                <ActionButton
                  onPress={() => void requestPushPermission()}
                  label={isRefreshingPushState ? 'Activando...' : 'Activar notificaciones'}
                  style={{ flex: 1 }}
                />
              )}

              {pushSettings.permissionStatus === 'denied' && !pushSettings.canAskAgain ? (
                <ActionButton
                  onPress={() => void openDeviceSettings()}
                  label="Abrir ajustes"
                  tone="secondary"
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
          )}
        </SectionCard>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={theme.colors.primary} />
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
    </AppScreen>
  );
}
