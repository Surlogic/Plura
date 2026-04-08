import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthSession } from '../src/context/auth/AuthSessionContext';
import { AuthWelcomeScreen } from '../src/features/shared/auth/screens/AuthWelcomeScreen';
import { theme } from '../src/theme';

export default function EntryScreen() {
  const { hasLoaded, role } = useAuthSession();

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (role === 'professional') {
    return <Redirect href="/dashboard" />;
  }

  if (role === 'client') {
    return <Redirect href="/(tabs)/index" />;
  }

  return <AuthWelcomeScreen />;
}
