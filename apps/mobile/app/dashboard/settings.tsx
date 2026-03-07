import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getClientPreferences,
  updateClientPreferences,
} from '../../src/services/clientFeatures';
import api from '../../src/services/api';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

type Preferences = {
  emailReminders: boolean;
  pushReminders: boolean;
  marketing: boolean;
};

export default function SettingsScreen() {
  const { role, logout } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;
    const description = role === 'professional'
      ? 'Si tienes una suscripcion activa, se dara de baja antes de eliminar tu cuenta.'
      : 'Se cancelaran tus proximas reservas antes de eliminar tu cuenta.';

    Alert.alert(
      'Eliminar cuenta',
      `${description} Esta accion no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await api.delete('/auth/me');
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('No se pudo eliminar la cuenta', 'Intenta nuevamente en unos minutos.');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
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

        <View className="mt-6 rounded-[22px] border border-red-200 bg-red-50 p-5">
          <Text className="font-semibold text-red-700">Eliminar cuenta</Text>
          <Text className="mt-2 text-xs text-red-600">
            {role === 'professional'
              ? 'La cuenta profesional se despublica y la suscripcion se cancela si sigue activa.'
              : 'Se cancelan tus proximos turnos y se cierra tu sesion en el dispositivo.'}
          </Text>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="mt-4 h-12 items-center justify-center rounded-full border border-red-200 bg-white"
          >
            <Text className="font-semibold text-red-600">
              {isDeletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
