import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import EmailVerificationCard from '../../components/auth/EmailVerificationCard';
import { useProfessionalProfileContext } from '../../context/ProfessionalProfileContext';
import { theme } from '../../theme';

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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <LinearGradient colors={theme.gradients.heroElevated} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-[30px] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-white/75">Panel profesional</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Hola, {profile.fullName}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">
            Desde aqui gestionas el negocio y tambien puedes revisar como se ve tu pagina publica en mobile.
          </Text>

          <View className="mt-5 flex-row flex-wrap" style={{ gap: 10 }}>
            <View className="rounded-full bg-white/15 px-4 py-2"><Text className="text-xs font-semibold text-white">Plan {profile.professionalPlan || 'BASIC'}</Text></View>
            <View className="rounded-full bg-white/15 px-4 py-2"><Text className="text-xs font-semibold text-white">{profile.rubro || 'Profesional'}</Text></View>
            {profile.slug ? <View className="rounded-full bg-white/15 px-4 py-2"><Text className="text-xs font-semibold text-white">@{profile.slug}</Text></View> : null}
          </View>

          <View className="mt-5 flex-row" style={{ gap: 10 }}>
            {publicPageRoute ? (
              <TouchableOpacity onPress={() => router.push(publicPageRoute as never)} className="flex-1 rounded-full bg-white px-4 py-3">
                <Text className="text-center font-bold text-secondary">Ver pagina publica</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => router.push('/dashboard/business-profile')} className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3">
              <Text className="text-center font-bold text-white">Editar negocio</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {!profile.emailVerified ? (
          <View className="mt-6">
            <EmailVerificationCard email={profile.email} emailVerified={profile.emailVerified} onStatusChanged={refreshProfile} variant="banner" />
          </View>
        ) : null}

        <View className="mt-6 rounded-[28px] border border-secondary/8 bg-white p-5 shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Resumen del negocio</Text>
          <View className="mt-4 flex-row flex-wrap justify-between">
            {spotlightItems.map((item) => (
              <View key={item.key} className="mb-4 w-[48%] rounded-[22px] bg-background p-4">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500">{item.label}</Text>
                <Text className="mt-2 text-base font-bold text-secondary">{item.value}</Text>
                <View className={`mt-3 self-start rounded-full px-3 py-1 ${item.tone}`}>
                  <Text className="text-[11px] font-semibold">{item.key === 'page' && publicPageRoute ? 'Activa' : item.key === 'page' ? 'Pendiente' : 'Visible'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-6 rounded-[28px] border border-secondary/8 bg-white p-5 shadow-sm">
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
