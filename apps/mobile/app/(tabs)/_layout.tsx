import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';

export default function TabsLayout() {
  const { role } = useProfessionalProfileContext();
  const isProfessional = role === 'professional';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1FB6A6', // Tu color primario (Esmeralda)
        tabBarInactiveTintColor: '#94A3B8', // Gris suave
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F4F6F8', // Fondo de tu app
          elevation: 10,
          shadowColor: '#0E2A47',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isProfessional ? 'Panel' : 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={isProfessional
                ? focused ? 'grid' : 'grid-outline'
                : focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: isProfessional ? 'Agenda' : 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={isProfessional
                ? focused ? 'calendar' : 'calendar-outline'
                : focused ? 'search' : 'search-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: isProfessional ? 'Servicios' : 'Favoritos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={isProfessional
                ? focused ? 'cut' : 'cut-outline'
                : focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: isProfessional ? 'Negocio' : 'Reservas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={isProfessional
                ? focused ? 'storefront' : 'storefront-outline'
                : focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
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
          title: isProfessional ? 'Cuenta' : 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
