import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useWorkerSession } from '../session/useWorkerSession';
import { WorkerBottomNav } from '../navigation/WorkerBottomNav';
import { theme } from '../../../theme';
import {
  CLIENT_HOME_ROUTE,
  PROFESSIONAL_HOME_ROUTE,
  UNIFIED_LOGIN_ROUTE,
} from '../../shared/auth/routes';
import { useAuthSession } from '../../../context/auth/AuthSessionContext';

export default function WorkerLayout() {
  const { hasLoaded, isAuthenticated, isWorker } = useWorkerSession();
  const session = useAuthSession();

  if (!hasLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={UNIFIED_LOGIN_ROUTE} />;
  }

  if (!isWorker) {
    if (session.role === 'professional') {
      return <Redirect href={PROFESSIONAL_HOME_ROUTE} />;
    }
    return <Redirect href={CLIENT_HOME_ROUTE} />;
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
          <Stack.Screen name="calendario" />
          <Stack.Screen name="reservas" />
          <Stack.Screen name="cuenta" />
        </Stack>
      </View>
      <WorkerBottomNav />
    </View>
  );
}
