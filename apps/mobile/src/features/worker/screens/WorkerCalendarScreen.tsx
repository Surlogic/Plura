import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isAxiosError } from 'axios';
import { AppScreen, surfaceStyles } from '../../../components/ui/AppScreen';
import { theme } from '../../../theme';
import { Ionicons } from '../../../lib/icons';
import { useWorkerSession } from '../session/useWorkerSession';
import {
  fetchWorkerCalendar,
  type WorkerBooking,
} from '../../../services/workerDashboard';
import { getApiErrorMessage } from '../../../services/errors';

const extractMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
  }
  return getApiErrorMessage(error, fallback);
};

const formatDateLabel = (value: string) => {
  try {
    return new Date(value).toLocaleString('es-UY', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatDayHeading = (key: string) => {
  try {
    return new Date(`${key}T00:00:00`).toLocaleDateString('es-UY', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  } catch {
    return key;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'CANCELLED':
      return 'Cancelada';
    case 'COMPLETED':
      return 'Completada';
    case 'NO_SHOW':
      return 'No asistio';
    default:
      return status;
  }
};

const statusTone = (status: string) => {
  if (status === 'CONFIRMED') return theme.colors.primarySoft;
  if (status === 'PENDING') return theme.colors.warningSoft;
  return theme.colors.surfaceHover;
};

const statusTextTone = (status: string) => {
  if (status === 'CONFIRMED') return theme.colors.primaryStrong;
  if (status === 'PENDING') return theme.colors.warning;
  return theme.colors.inkMuted;
};

export function WorkerCalendarScreen() {
  const { workerSummary, hasLoaded } = useWorkerSession();
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMessage(null);
    try {
      const data = await fetchWorkerCalendar();
      setBookings(data);
    } catch (error) {
      setErrorMessage(extractMessage(error, 'No pudimos cargar tu agenda.'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initial = async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    };
    void initial();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkerBooking[]>();
    for (const booking of bookings) {
      const day = booking.startDateTime.slice(0, 10);
      const existing = map.get(day) ?? [];
      existing.push(booking);
      map.set(day, existing);
    }
    return Array.from(map.entries())
      .map(([day, list]) => ({
        day,
        list: list.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime)),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [bookings]);

  return (
    <AppScreen scroll refreshing={refreshing} onRefresh={handleRefresh}>
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
            {workerSummary?.professionalName
              ? `Tu agenda en ${workerSummary.professionalName}`
              : 'Tu agenda'}
          </Text>
          {workerSummary ? (
            <Text className="mt-2 text-sm text-secondary/80">
              Hola, {workerSummary.displayName}. Estas son tus reservas asignadas.
            </Text>
          ) : null}
          <TouchableOpacity
            className="mt-4 self-start"
            activeOpacity={0.85}
            onPress={() => router.push('/trabajador/reservas')}
          >
            <View className="flex-row items-center gap-2 rounded-full bg-white/30 px-4 py-2">
              <Ionicons name="list-outline" size={14} color={theme.colors.ink} />
              <Text className="text-xs font-bold text-secondary">Ver todas las reservas</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {!hasLoaded || loading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {errorMessage ? (
          <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
            <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
          </View>
        ) : null}

        {!loading && grouped.length === 0 ? (
          <View className="mt-6 rounded-[28px] p-6" style={surfaceStyles.softCard}>
            <Text className="text-sm text-muted">
              No tenes reservas asignadas en los proximos 30 dias.
            </Text>
          </View>
        ) : null}

        <View className="mt-6" style={{ gap: 18 }}>
          {grouped.map(({ day, list }) => (
            <View key={day}>
              <Text className="text-sm font-semibold text-secondary">
                {formatDayHeading(day)}
              </Text>
              <View className="mt-3" style={{ gap: 10 }}>
                {list.map((booking) => (
                  <View
                    key={booking.id}
                    className="rounded-[24px] p-4"
                    style={surfaceStyles.softCard}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-secondary">
                          {formatDateLabel(booking.startDateTime)}
                        </Text>
                        <Text className="mt-1 text-base font-semibold text-secondary">
                          {booking.serviceNameSnapshot}
                        </Text>
                        <Text className="mt-1 text-xs text-muted">
                          {booking.userFullName} - {booking.serviceDurationSnapshot}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: statusTone(booking.operationalStatus) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: statusTextTone(booking.operationalStatus) },
                          ]}
                        >
                          {statusLabel(booking.operationalStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
