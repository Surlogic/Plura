import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  buildClientNotifications,
  type MobileNotification,
} from '../../src/services/clientFeatures';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function NotificationsScreen() {
  const { role, profile } = useProfessionalProfileContext();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MobileNotification[]>([]);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Actividad</Text>
        <Text className="mt-2 text-3xl font-bold text-secondary">Notificaciones</Text>
        <Text className="mt-2 text-sm text-gray-500">
          {role === 'professional'
            ? 'Alertas del panel profesional y estado de la cuenta.'
            : 'Recordatorios y novedades de tu cuenta.'}
        </Text>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#0A7A43" />
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
      </ScrollView>
    </SafeAreaView>
  );
}
