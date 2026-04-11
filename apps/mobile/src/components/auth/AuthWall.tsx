import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '../../lib/icons';
import { ActionButton, SectionCard } from '../ui/MobileSurface';
import { theme } from '../../theme';

type AuthWallProps = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AuthWall({
  title,
  description,
  icon = 'lock-closed-outline',
}: AuthWallProps) {
  return (
    <SectionCard style={{ marginTop: 24 }}>
      <View className="items-center px-2 py-2">
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundSoft,
          }}
        >
          <Ionicons name={icon} size={24} color={theme.colors.primaryStrong} />
        </View>

        <Text className="mt-4 text-center text-xl font-bold text-secondary">{title}</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-gray-500">{description}</Text>

        <ActionButton
          label="Iniciar sesion"
          onPress={() => router.push('/(auth)/login')}
          style={{ alignSelf: 'stretch', marginTop: 20 }}
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 14 }}>
          <Text style={{ color: theme.colors.primaryStrong, fontWeight: '700' }}>
            Crear cuenta
          </Text>
        </TouchableOpacity>
      </View>
    </SectionCard>
  );
}
