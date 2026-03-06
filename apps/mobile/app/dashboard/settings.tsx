import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getClientPreferences,
  updateClientPreferences,
} from '../../src/services/clientFeatures';

type Preferences = {
  emailReminders: boolean;
  pushReminders: boolean;
  marketing: boolean;
};

export default function SettingsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>({
    emailReminders: true,
    pushReminders: false,
    marketing: false,
  });

  useEffect(() => {
    const load = async () => {
      const next = await getClientPreferences();
      setPreferences(next);
      setIsLoading(false);
    };
    load();
  }, []);

  const toggle = async (key: keyof Preferences) => {
    const next = await updateClientPreferences({ [key]: !preferences[key] });
    setPreferences(next);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#1FB6A6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-6 pt-6">
        <Text className="text-3xl font-bold text-secondary">Configuracion</Text>
        <Text className="mt-2 text-sm text-gray-500">Preferencias de cuenta para mobile.</Text>

        <View className="mt-8 rounded-[22px] bg-white p-5 border border-secondary/10">
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Recordatorios por email</Text>
              <Text className="text-xs text-gray-500 mt-1">Avisos antes de cada turno.</Text>
            </View>
            <Switch value={preferences.emailReminders} onValueChange={() => toggle('emailReminders')} />
          </View>

          <View className="mt-4 flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Recordatorios push</Text>
              <Text className="text-xs text-gray-500 mt-1">Nuevas alertas en tu dispositivo.</Text>
            </View>
            <Switch value={preferences.pushReminders} onValueChange={() => toggle('pushReminders')} />
          </View>

          <View className="mt-4 flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-secondary">Novedades y promos</Text>
              <Text className="text-xs text-gray-500 mt-1">Actualizaciones de productos.</Text>
            </View>
            <Switch value={preferences.marketing} onValueChange={() => toggle('marketing')} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
