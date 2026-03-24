import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useProfessionalProfileContext } from '../src/context/ProfessionalProfileContext';
import { theme } from '../src/theme';

export default function EntryScreen() {
  const { hasLoaded, role } = useProfessionalProfileContext();

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

  return <Redirect href="/(tabs)" />;
}