import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  getProfessionalSchedule,
  updateProfessionalSchedule,
} from '../../src/services/professionalConfig';
import type { WorkDayKey, WorkDaySchedule, ProfessionalSchedule } from '../../src/types/professional';
import { AppScreen } from '../../src/components/ui/AppScreen';
import { MessageCard, ScreenHero, SectionCard } from '../../src/components/ui/MobileSurface';

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
        <ActivityIndicator color="#0A7A43" />
      </View>
    );
  }

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <ScreenHero
          eyebrow="Horarios"
          title="Disponibilidad semanal"
          description="Define la agenda semanal con una lectura mas ordenada y facil de ajustar."
          icon="time-outline"
          badges={[{ label: `${days.filter((day) => day.enabled).length} dias activos`, tone: 'light' }]}
        />

        {days.map((day, index) => (
          <SectionCard key={day.day} style={{ marginTop: 16 }}>
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
          </SectionCard>
        ))}

        {message ? <MessageCard message={message} tone={message.includes('correctamente') ? 'success' : 'primary'} style={{ marginTop: 16 }} /> : null}

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
    </AppScreen>
  );
}
