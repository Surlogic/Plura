import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuthSession } from '../../src/context/auth/AuthSessionContext';
import { ProfessionalBottomNav } from '../../src/features/professional/navigation/ProfessionalBottomNav';
import { theme } from '../../src/theme';

export default function ProfessionalDashboardLayout() {
  const { hasLoaded, role, isAuthenticated } = useAuthSession();

  if (!hasLoaded) {
    return null;
  }

  if (role !== 'professional') {
    return <Redirect href={isAuthenticated ? '/(tabs)/index' : '/(auth)/login'} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="agenda" />
          <Stack.Screen name="services" />
          <Stack.Screen name="business-profile" />
          <Stack.Screen name="billing" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="notifications" />
        </Stack>
      </View>
      <ProfessionalBottomNav />
    </View>
  );
}
