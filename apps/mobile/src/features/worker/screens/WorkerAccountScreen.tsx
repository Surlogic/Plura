import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AppScreen, surfaceStyles } from '../../../components/ui/AppScreen';
import { Ionicons } from '../../../lib/icons';
import { theme } from '../../../theme';
import { useWorkerSession } from '../session/useWorkerSession';
import { selectContext } from '../../../services/authContext';
import { setSession } from '../../../services/session';
import { homeRouteForContext } from '../../shared/auth/routes';

export function WorkerAccountScreen() {
  const { workerSummary, contexts, activeContext, hasLoaded, refreshProfile, logout } =
    useWorkerSession();

  const otherContexts = (contexts ?? []).filter((descriptor) => {
    if (!activeContext) return true;
    if (descriptor.type !== activeContext.type) return true;
    if (descriptor.workerId && activeContext.workerId) {
      return descriptor.workerId !== activeContext.workerId;
    }
    return descriptor.professionalId !== activeContext.professionalId;
  });

  const handleSwitch = async (descriptor: (typeof contexts)[number]) => {
    try {
      const response = await selectContext({
        type: descriptor.type,
        workerId: descriptor.workerId ?? undefined,
        professionalId: descriptor.professionalId ?? undefined,
      });
      if (response.accessToken) {
        await setSession({ accessToken: response.accessToken });
      }
      await refreshProfile();
      router.replace(homeRouteForContext(response.activeContext ?? descriptor));
    } catch {
      // El contexto no cambia si falla; refresca para mantener consistencia.
      await refreshProfile();
    }
  };

  return (
    <AppScreen scroll>
      <View className="px-4 pt-4">
        <LinearGradient
          colors={theme.gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[28px] px-5 py-5"
        >
          <Text className="text-xs font-bold uppercase tracking-[2px] text-secondary/70">
            Trabajador
          </Text>
          <Text className="mt-2 text-2xl font-semibold text-secondary">
            {workerSummary?.displayName ?? 'Mi cuenta'}
          </Text>
          {workerSummary?.professionalName ? (
            <Text className="mt-2 text-sm text-secondary/80">
              Trabajas en {workerSummary.professionalName}.
            </Text>
          ) : null}
        </LinearGradient>

        {!hasLoaded ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {workerSummary ? (
          <View className="mt-4 rounded-[24px] p-5" style={surfaceStyles.softCard}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={18} color={theme.colors.inkMuted} />
              <Text className="text-sm text-secondary">{workerSummary.email}</Text>
            </View>
            <View className="mt-3 flex-row items-center gap-3">
              <Ionicons name="storefront-outline" size={18} color={theme.colors.inkMuted} />
              <Text className="text-sm text-secondary">
                {workerSummary.professionalName ?? 'Local sin nombre'}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center gap-3">
              <Ionicons name="ribbon-outline" size={18} color={theme.colors.inkMuted} />
              <Text className="text-sm text-secondary">
                Estado: {workerSummary.status === 'ACTIVE' ? 'Activo' : workerSummary.status}
              </Text>
            </View>
          </View>
        ) : null}

        {otherContexts.length > 0 ? (
          <View className="mt-4 rounded-[24px] p-5" style={surfaceStyles.softCard}>
            <Text className="text-sm font-semibold text-secondary">Otros accesos</Text>
            <Text className="mt-1 text-xs text-muted">
              Tu cuenta tambien puede entrar como cliente o gestionar otros locales.
            </Text>
            <View className="mt-3" style={{ gap: 10 }}>
              {otherContexts.map((descriptor) => {
                const key = `${descriptor.type}-${descriptor.workerId ?? descriptor.professionalId ?? 'self'}`;
                const label =
                  descriptor.type === 'CLIENT'
                    ? 'Entrar como cliente'
                    : descriptor.type === 'PROFESSIONAL'
                      ? `Administrar ${descriptor.professionalName ?? 'mi local'}`
                      : `Trabajar en ${descriptor.professionalName ?? 'otro local'}`;
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.85}
                    onPress={() => void handleSwitch(descriptor)}
                  >
                    <View
                      className="rounded-[18px] border px-4 py-3"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      }}
                    >
                      <Text className="text-sm font-semibold text-secondary">{label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          className="mt-6"
          activeOpacity={0.85}
          onPress={() => void logout()}
        >
          <View
            className="flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-3"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
            <Text className="text-sm font-semibold" style={{ color: theme.colors.danger }}>
              Cerrar sesion
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
