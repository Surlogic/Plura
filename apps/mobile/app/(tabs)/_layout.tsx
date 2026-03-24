import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSession } from '../../src/context/ProfessionalProfileContext';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  const { hasLoaded } = useAuthSession();
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = Platform.OS === 'ios' ? 60 : 58;
  const bottomPadding =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 14)
      : Platform.OS === 'web'
        ? 14
        : Math.max(insets.bottom, 12);

  if (!hasLoaded) {
    return null;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.inkFaint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          borderRadius: 28,
          position: 'absolute',
          elevation: 18,
          shadowColor: theme.colors.ink,
          shadowOpacity: 0.09,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          height: baseTabBarHeight + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          marginHorizontal: Platform.OS === 'web' ? 0 : 14,
          marginBottom: Platform.OS === 'ios' ? 12 : 10,
          alignSelf: 'center',
          width: '100%',
          maxWidth: Platform.OS === 'web' ? 560 : undefined,
          left: Platform.OS === 'web' ? 0 : undefined,
          right: Platform.OS === 'web' ? 0 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}