import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalProfileContext } from '../../src/context/ProfessionalProfileContext';
import { AppScreen } from '../../src/components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../src/components/ui/MobileSurface';

export default function ProfessionalNotificationsScreen() {
  const { profile } = useProfessionalProfileContext();

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}>
      <ScreenHero
        eyebrow="Notificaciones profesional"
        title="Estado del negocio"
        description="Centro transitorio de alertas para profesional mientras cerramos la paridad completa con web."
        icon="notifications-outline"
        badges={[
          {
            label: profile?.emailVerified ? 'Email verificado' : 'Email pendiente',
            tone: profile?.emailVerified ? 'success' : 'warning',
          },
          { label: `Plan ${profile?.professionalPlan || 'BASIC'}`, tone: 'light' },
        ]}
      />

      <View style={{ gap: 12, marginTop: 24 }}>
        <SectionCard>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-bold text-secondary">Panel profesional separado</Text>
              <Text className="mt-2 text-sm text-gray-600">
                Tus accesos mobile ya no deberian convivir con las tabs del cliente.
              </Text>
            </View>
            <StatusPill label="Sistema" tone="primary" />
          </View>
        </SectionCard>

        <SectionCard>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-bold text-secondary">Revisa tu configuracion</Text>
              <Text className="mt-2 text-sm text-gray-600">
                Completa horarios, servicios, perfil del negocio y facturacion desde el dashboard profesional.
              </Text>
            </View>
            <StatusPill label="Accion" tone="warning" />
          </View>
          <ActionButton
            label="Ir a configuracion"
            onPress={() => router.push('/dashboard/settings')}
            style={{ marginTop: 16 }}
          />
        </SectionCard>
      </View>
    </AppScreen>
  );
}