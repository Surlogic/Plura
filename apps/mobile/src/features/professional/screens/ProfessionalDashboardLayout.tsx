import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useProfessionalSession } from '../session/useProfessionalSession';
import { ProfessionalBottomNav } from '../../../features/professional/navigation/ProfessionalBottomNav';
import { theme } from '../../../theme';

export default function ProfessionalDashboardLayout() {
  const { hasLoaded, isAuthenticated, isProfessional } = useProfessionalSession();

  if (!hasLoaded) {
    return null;
  }

  if (!isProfessional) {
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
