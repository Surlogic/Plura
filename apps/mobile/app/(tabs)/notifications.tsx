import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  buildClientNotifications,
  type MobileNotification,
} from '../../src/services/clientFeatures';

export default function NotificationsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MobileNotification[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const notifications = await buildClientNotifications();
      setItems(notifications);
      setIsLoading(false);
    };

    load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Actividad</Text>
        <Text className="mt-2 text-3xl font-bold text-secondary">Notificaciones</Text>
        <Text className="mt-2 text-sm text-gray-500">Recordatorios y novedades de tu cuenta.</Text>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color="#1FB6A6" />
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
                    color={item.type === 'booking' ? '#1FB6A6' : '#0E2A47'}
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
