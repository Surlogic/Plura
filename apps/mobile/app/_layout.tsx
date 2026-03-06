import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProfessionalProfileProvider } from '../src/context/ProfessionalProfileContext';

export default function RootLayout() {
  return (
    <ProfessionalProfileProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Aquí definiremos las rutas en las siguientes partes */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reservar" options={{ headerShown: false }} />
      </Stack>
    </ProfessionalProfileProvider>
  );
}