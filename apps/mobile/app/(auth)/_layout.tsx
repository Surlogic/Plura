import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login-client" />
      <Stack.Screen name="login-professional" />
      <Stack.Screen name="register-client" />
      <Stack.Screen name="register-professional" />
      <Stack.Screen name="complete-phone-client" />
      <Stack.Screen name="complete-phone-professional" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
