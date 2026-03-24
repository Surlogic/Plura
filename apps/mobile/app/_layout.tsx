import 'expo-dev-client';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthSessionProvider } from '../src/context/ProfessionalProfileContext';
import { theme } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <View style={styles.root}>
          <View style={styles.shell}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="dashboard" options={{ headerShown: false }} />
              <Stack.Screen name="reservar" options={{ headerShown: false }} />
            </Stack>
          </View>
        </View>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  shell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
});