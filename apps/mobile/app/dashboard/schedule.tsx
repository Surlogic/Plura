import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getProfessionalSchedule,
  updateProfessionalSchedule,
} from '../../src/services/professionalConfig';
import type { WorkDayKey, WorkDaySchedule, ProfessionalSchedule } from '../../src/types/professional';

const DAY_LABELS: Record<WorkDayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miercoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sabado',
  sun: 'Domingo',
};

const createDefaultDays = (): WorkDaySchedule[] =>
  (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as WorkDayKey[]).map((day) => ({
    day,
    enabled: day !== 'sun',
    paused: false,
    ranges: [{ id: `${day}-main`, start: '09:00', end: '18:00' }],
  }));

export default function ScheduleScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [days, setDays] = useState<WorkDaySchedule[]>(createDefaultDays());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const schedule = await getProfessionalSchedule();
        setDays(Array.isArray(schedule.days) && schedule.days.length > 0 ? schedule.days : createDefaultDays());
      } catch {
        setDays(createDefaultDays());
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const canSave = useMemo(
    () => !isSaving && days.every((day) => day.ranges.every((range) => range.start && range.end)),
    [days, isSaving],
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#1FB6A6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <Text className="text-3xl font-bold text-secondary">Horarios</Text>
        <Text className="mt-2 text-sm text-gray-500">Define disponibilidad semanal de tu agenda.</Text>

        {days.map((day, index) => (
          <View key={day.day} className="mt-4 rounded-[22px] bg-white p-5 border border-secondary/10">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-secondary">{DAY_LABELS[day.day]}</Text>
              <Switch
                value={day.enabled}
                onValueChange={(value) => {
                  setDays((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, enabled: value } : item,
                    ),
                  );
                }}
              />
            </View>

            <View className="mt-3 flex-row" style={{ gap: 8 }}>
              <TextInput
                className="flex-1 h-11 rounded-xl border border-secondary/10 bg-background px-3"
                placeholder="09:00"
                value={day.ranges[0]?.start || ''}
                onChangeText={(text) => {
                  setDays((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            ranges: [{ ...(item.ranges[0] || { id: `${item.day}-main` }), start: text, end: item.ranges[0]?.end || '18:00' }],
                          }
                        : item,
                    ),
                  );
                }}
              />
              <TextInput
                className="flex-1 h-11 rounded-xl border border-secondary/10 bg-background px-3"
                placeholder="18:00"
                value={day.ranges[0]?.end || ''}
                onChangeText={(text) => {
                  setDays((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            ranges: [{ ...(item.ranges[0] || { id: `${item.day}-main` }), start: item.ranges[0]?.start || '09:00', end: text }],
                          }
                        : item,
                    ),
                  );
                }}
              />
            </View>
          </View>
        ))}

        {message ? <Text className="mt-4 text-sm text-secondary">{message}</Text> : null}

        <TouchableOpacity
          disabled={!canSave}
          onPress={async () => {
            setIsSaving(true);
            setMessage(null);
            try {
              const payload: ProfessionalSchedule = {
                days,
                pauses: [],
              };
              await updateProfessionalSchedule(payload);
              setMessage('Horarios guardados correctamente.');
            } catch {
              setMessage('No se pudo guardar la agenda.');
            } finally {
              setIsSaving(false);
            }
          }}
          className={`mt-6 h-14 rounded-full items-center justify-center ${canSave ? 'bg-secondary' : 'bg-gray-300'}`}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Guardar agenda</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
