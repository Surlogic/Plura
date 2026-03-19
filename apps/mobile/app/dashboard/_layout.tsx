import { Stack } from 'expo-router';
import { theme } from '../../src/theme';

export default function DashboardSubLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Stack.Screen name="services" options={{ title: 'Mis Servicios' }} />
      <Stack.Screen name="business-profile" options={{ title: 'Perfil del negocio' }} />
      <Stack.Screen name="billing" options={{ title: 'Facturacion' }} />
      <Stack.Screen name="schedule" options={{ title: 'Horarios' }} />
      <Stack.Screen name="settings" options={{ title: 'Configuracion' }} />
    </Stack>
  );
}
