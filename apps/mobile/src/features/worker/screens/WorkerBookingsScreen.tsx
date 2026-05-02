import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isAxiosError } from 'axios';
import { AppScreen, surfaceStyles } from '../../../components/ui/AppScreen';
import { theme } from '../../../theme';
import { Ionicons } from '../../../lib/icons';
import { fetchWorkerBookings, type WorkerBooking } from '../../../services/workerDashboard';
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
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
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

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const isoDatePlusDays = (days: number) =>
  new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);

export function WorkerBookingsScreen() {
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [range, setRange] = useState({
    dateFrom: todayIsoDate(),
    dateTo: isoDatePlusDays(60),
  });

  const load = useCallback(
    async (params: { dateFrom: string; dateTo: string }) => {
      setErrorMessage(null);
      try {
        const data = await fetchWorkerBookings(params);
        setBookings(data);
      } catch (error) {
        setErrorMessage(extractMessage(error, 'No pudimos cargar tus reservas.'));
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const initial = async () => {
      setLoading(true);
      await load(range);
      if (!cancelled) setLoading(false);
    };
    void initial();
    return () => {
      cancelled = true;
    };
  }, [load, range]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(range);
    setRefreshing(false);
  }, [load, range]);

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
            Mis reservas
          </Text>
          <Text className="mt-2 text-2xl font-semibold text-secondary">
            Reservas asignadas
          </Text>
          <Text className="mt-2 text-sm text-secondary/80">
            Filtra por rango de fechas para revisar tu historial.
          </Text>

          <TouchableOpacity
            className="mt-4 self-start"
            activeOpacity={0.85}
            onPress={() => router.push('/trabajador/calendario')}
          >
            <View className="flex-row items-center gap-2 rounded-full bg-white/30 px-4 py-2">
              <Ionicons name="calendar-outline" size={14} color={theme.colors.ink} />
              <Text className="text-xs font-bold text-secondary">Volver a la agenda</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <View className="mt-4 rounded-[24px] p-4" style={surfaceStyles.softCard}>
          <View style={styles.rangeRow}>
            <View style={styles.rangeField}>
              <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={range.dateFrom}
                onChangeText={(value) => setRange((prev) => ({ ...prev, dateFrom: value }))}
                autoCapitalize="none"
                placeholderTextColor={theme.colors.inkFaint}
              />
            </View>
            <View style={styles.rangeField}>
              <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={range.dateTo}
                onChangeText={(value) => setRange((prev) => ({ ...prev, dateTo: value }))}
                autoCapitalize="none"
                placeholderTextColor={theme.colors.inkFaint}
              />
            </View>
          </View>
          <TouchableOpacity
            className="mt-3 self-start"
            activeOpacity={0.85}
            onPress={() => void load(range)}
            disabled={loading || refreshing}
          >
            <View className="rounded-full bg-secondary px-4 py-2">
              <Text className="text-xs font-bold text-white">Aplicar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        {errorMessage ? (
          <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
            <Text className="text-center text-xs text-red-600">{errorMessage}</Text>
          </View>
        ) : null}

        {!loading && bookings.length === 0 ? (
          <View className="mt-6 rounded-[24px] p-6" style={surfaceStyles.softCard}>
            <Text className="text-sm text-muted">No tenes reservas en ese rango.</Text>
          </View>
        ) : null}

        <View className="mt-4" style={{ gap: 10 }}>
          {bookings.map((booking) => (
            <View key={booking.id} className="rounded-[24px] p-4" style={surfaceStyles.softCard}>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rangeField: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    marginTop: 6,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    color: theme.colors.secondary,
  },
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
