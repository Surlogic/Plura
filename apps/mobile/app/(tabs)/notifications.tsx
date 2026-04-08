import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  buildClientNotifications,
  type MobileNotification,
} from '../../src/services/clientFeatures';
import { useAuthSession } from '../../src/context/auth/AuthSessionContext';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../src/components/ui/MobileSurface';
import { theme } from '../../src/theme';
import AuthWall from '../../src/components/auth/AuthWall';

const getNotificationBadge = (type: MobileNotification['type']) => {
  if (type === 'booking') {
    return {
      label: 'Reserva',
      tone: 'success' as const,
    };
  }

  return {
    label: 'Info',
    tone: 'neutral' as const,
  };
};

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<MobileNotification[]>([]);
  const {
    settings: pushSettings,
    isLoading: isLoadingPushState,
    isRefreshing: isRefreshingPushState,
    isEnabled: arePushNotificationsEnabled,
    requestPermission: requestPushPermission,
    disablePush,
    syncPermission: syncPushPermission,
  } = usePushNotifications();

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
    }
  }, [isAuthenticated]);

  const [pushStatus, setPushStatus] = useState(pushSettings);

  useEffect(() => {
    setPushStatus(pushSettings);
  }, [pushSettings]);

  const load = useCallback(async (options?: { showLoader?: boolean }) => {
    if (!isAuthenticated) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [notifications, nextPushState] = await Promise.all([
        buildClientNotifications(),
        syncPushPermission(),
      ]);
      setItems(notifications);
      setPushStatus(nextPushState);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, syncPushPermission]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load({ showLoader: false });
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  if (!isAuthenticated) {
    return (
      <AppScreen
        scroll
        edges={['top']}
        refreshing={isRefreshing}
        onRefresh={() => {
          void handleRefresh();
        }}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
      >
        <ScreenHero
          eyebrow="Notificaciones"
          title="Tus alertas van en tu cuenta"
          description="Puedes explorar sin iniciar sesion, pero las alertas de reservas y recordatorios requieren una cuenta activa."
          icon="notifications-outline"
          badges={[{ label: 'Acceso privado', tone: 'warning' }]}
        />
        <AuthWall
          title="Inicia sesion para ver alertas"
          description="Asi podremos mostrarte recordatorios de reservas, cambios importantes y avisos relevantes para tu cuenta."
          icon="notifications-outline"
        />
      </AppScreen>
    );
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
    : pushStatus.permissionStatus === 'denied'
      ? 'Bloqueadas'
      : 'Pendientes';

  return (
    <AppScreen
      scroll
      edges={['top']}
      refreshing={isRefreshing}
      onRefresh={() => {
        void handleRefresh();
      }}
      contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
    >
      <ScreenHero
        eyebrow="Notificaciones"
        title="Tus alertas como cliente"
        description="Revisa recordatorios de reservas y novedades relevantes para tu cuenta."
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
              Estado del dispositivo: {pushStatus.permissionStatus || 'pendiente'}
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

        {pushStatus.permissionStatus === 'denied' ? (
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
              Cuando confirmes una reserva o exista una novedad importante, la veras aqui.
            </Text>
          </SectionCard>
        ) : (
          items.map((item) => {
            const badge = getNotificationBadge(item.type);

            return (
              <SectionCard key={item.id}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-secondary">{item.title}</Text>
                    <Text className="mt-2 text-sm text-gray-600">{item.body}</Text>
                    <Text className="mt-3 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <StatusPill label={badge.label} tone={badge.tone} />
                </View>
              </SectionCard>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}
