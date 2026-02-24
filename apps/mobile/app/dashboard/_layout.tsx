import { Stack } from 'expo-router';

export default function DashboardSubLayout() {
  return (
    <Stack screenOptions={{
      headerShadowVisible: false,
      headerStyle: { backgroundColor: '#F4F6F8' },
      headerTintColor: '#0E2A47',
      headerTitleStyle: { fontWeight: 'bold' },
      headerBackTitleVisible: false,
    }}>
      <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Stack.Screen name="services" options={{ title: 'Mis Servicios' }} />
    </Stack>
  );
}