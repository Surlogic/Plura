import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useProfessionalProfileContext } from '../src/context/ProfessionalProfileContext';

export default function EntryScreen() {
  const { profile, hasLoaded } = useProfessionalProfileContext();

  if (!hasLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1FB6A6" />
      </View>
    );
  }

  // Si hay perfil, va al dashboard, si no, va a la home/auth pública
  if (profile) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}