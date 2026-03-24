import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import EmailVerificationCard from '../../components/auth/EmailVerificationCard';
import { useProfessionalProfileContext } from '../../context/ProfessionalProfileContext';
import { theme } from '../../theme';
import { AppScreen } from '../../components/ui/AppScreen';
import {
  ActionButton,
  ScreenHero,
  SectionCard,
  StatusPill,
} from '../../components/ui/MobileSurface';

const quickLinks = [
  { key: 'agenda', title: 'Agenda', subtitle: 'Turnos del dia y acciones rapidas', icon: 'calendar-outline' as const, color: theme.colors.primary, route: '/dashboard/agenda' },
  { key: 'services', title: 'Servicios', subtitle: 'Alta, edicion y categorias', icon: 'cut-outline' as const, color: theme.colors.ink, route: '/dashboard/services' },
  { key: 'business', title: 'Negocio', subtitle: 'Perfil publico y datos base', icon: 'storefront-outline' as const, color: theme.colors.ink, route: '/dashboard/business-profile' },
  { key: 'schedule', title: 'Horarios', subtitle: 'Disponibilidad semanal', icon: 'time-outline' as const, color: theme.colors.ink, route: '/dashboard/schedule' },
  { key: 'billing', title: 'Facturacion', subtitle: 'Plan y datos de cobro', icon: 'card-outline' as const, color: theme.colors.ink, route: '/dashboard/billing' },
  { key: 'settings', title: 'Cuenta', subtitle: 'Seguridad y preferencias', icon: 'settings-outline' as const, color: theme.colors.ink, route: '/dashboard/settings' },
];

export function ProfessionalHomeTab() {
  const { profile, refreshProfile } = useProfessionalProfileContext();

  if (!profile) return null;

  const publicPageRoute = profile.slug ? `/profesional/${profile.slug}` : null;
  const spotlightItems = [
    { key: 'page', label: 'Pagina publica', value: publicPageRoute ? 'Lista para clientes' : 'Falta slug publico', tone: publicPageRoute ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700' },
    { key: 'plan', label: 'Plan activo', value: profile.professionalPlan || 'BASIC', tone: 'bg-secondary/10 text-secondary' },
    { key: 'mode', label: 'Tipo de atencion', value: profile.tipoCliente || 'Profesional', tone: 'bg-secondary/10 text-secondary' },
    { key: 'location', label: 'Ubicacion', value: profile.city || profile.location || 'Sin configurar', tone: 'bg-secondary/10 text-secondary' },
  ];

  return (
    <AppScreen scroll edges={['top']} contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <ScreenHero
          eyebrow="Panel profesional"
          title={`Hola, ${profile.fullName}`}
          description="Desde aqui gestionas el negocio y tambien puedes revisar como se ve tu pagina publica en mobile."
          icon="briefcase-outline"
          badges={[
            { label: `Plan ${profile.professionalPlan || 'BASIC'}`, tone: 'light' },
            { label: profile.rubro || 'Profesional', tone: 'light' },
            ...(profile.slug ? [{ label: `@${profile.slug}`, tone: 'light' as const }] : []),
          ]}
          primaryAction={publicPageRoute ? {
            label: 'Ver pagina publica',
            onPress: () => router.push(publicPageRoute as never),
            tone: 'secondary',
          } : undefined}
          secondaryAction={{
            label: 'Editar negocio',
            onPress: () => router.push('/dashboard/business-profile'),
            tone: 'light',
          }}
        />

        {!profile.emailVerified ? (
          <View className="mt-6">
            <EmailVerificationCard email={profile.email} emailVerified={profile.emailVerified} onStatusChanged={refreshProfile} variant="banner" />
          </View>
        ) : null}

        <SectionCard style={{ marginTop: 24 }}>
          <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Resumen del negocio</Text>
          <View className="mt-4 flex-row flex-wrap justify-between">
            {spotlightItems.map((item) => (
              <View key={item.key} className="mb-4 w-[48%] rounded-[22px] bg-background p-4">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">{item.label}</Text>
                <Text className="mt-2 text-base font-bold text-secondary">{item.value}</Text>
                <StatusPill
                  label={item.key === 'page' && publicPageRoute ? 'Activa' : item.key === 'page' ? 'Pendiente' : 'Visible'}
                  tone={item.key === 'page' && !publicPageRoute ? 'warning' : item.key === 'page' ? 'primary' : 'neutral'}
                  style={{ marginTop: 12 }}
                />
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard style={{ marginTop: 24 }}>
          <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Gestion</Text>
          <Text className="mt-2 text-2xl font-bold text-secondary">Accesos del profesional</Text>
          <View className="mt-5 flex-row flex-wrap justify-between">
            {quickLinks.map((item) => (
              <TouchableOpacity key={item.key} onPress={() => router.push(item.route as never)} className="mb-4 w-[48%] rounded-[24px] border border-secondary/10 bg-background p-5" activeOpacity={0.9}>
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}15` }}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text className="mt-4 text-base font-bold text-secondary">{item.title}</Text>
                <Text className="mt-1 text-xs leading-5 text-gray-500">{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>
    </AppScreen>
  );
}
