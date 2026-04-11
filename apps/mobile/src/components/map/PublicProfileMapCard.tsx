import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '../../lib/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

type PublicProfileMapCardProps = {
  title: string;
  subtitle?: string;
  mapImageUrl?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  actionLabel?: string;
  fallbackMessage?: string;
};

const MapCardShell = ({
  children,
  disabled,
  onPress,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={disabled ? 1 : 0.92}
    disabled={disabled}
    onPress={onPress}
    className="overflow-hidden rounded-[26px] border border-secondary/10 bg-[#0F172A]"
    style={theme.shadow.lift}
  >
    {children}
  </TouchableOpacity>
);

export default function PublicProfileMapCard({
  title,
  subtitle,
  mapImageUrl,
  isLoading = false,
  disabled = false,
  onPress,
  actionLabel = 'Abrir mapa',
  fallbackMessage = 'No pudimos mostrar el mapa todavia.',
}: PublicProfileMapCardProps) {
  if (isLoading) {
    return (
      <MapCardShell disabled>
        <LinearGradient
          colors={['#0F172A', '#162033', '#0E96C2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-64 items-center justify-center px-6"
        >
          <ActivityIndicator color="#FFFFFF" />
          <Text className="mt-4 text-center text-sm font-semibold text-white">
            Buscando la mejor ubicacion para mostrarte el mapa...
          </Text>
        </LinearGradient>
      </MapCardShell>
    );
  }

  if (!mapImageUrl) {
    return (
      <MapCardShell disabled={disabled} onPress={onPress}>
        <LinearGradient
          colors={['#0F172A', '#162033', '#36C8F4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-64 justify-between px-5 py-5"
        >
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-white/15 px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-white/85">
                Ubicacion
              </Text>
            </View>
            {!disabled ? (
              <View className="rounded-full bg-white px-3 py-2">
                <Text className="text-[11px] font-bold text-secondary">{actionLabel}</Text>
              </View>
            ) : null}
          </View>

          <View className="items-start">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-white/12">
              <Ionicons name="location" size={28} color="#FFFFFF" />
            </View>
            <Text className="text-xl font-bold text-white">{title}</Text>
            {subtitle ? (
              <Text className="mt-2 text-sm leading-6 text-white/80">{subtitle}</Text>
            ) : null}
            <Text className="mt-4 text-sm text-white/72">{fallbackMessage}</Text>
          </View>
        </LinearGradient>
      </MapCardShell>
    );
  }

  return (
    <MapCardShell disabled={disabled} onPress={onPress}>
      <ImageBackground
        source={{ uri: mapImageUrl }}
        resizeMode="cover"
        className="h-64 justify-between"
      >
        <LinearGradient
          colors={['rgba(15,23,42,0.18)', 'rgba(15,23,42,0.34)', 'rgba(15,23,42,0.82)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="h-full justify-between px-5 py-5"
        >
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-white/18 px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-white/90">
                Mapa en vivo
              </Text>
            </View>
            {!disabled ? (
              <View className="rounded-full bg-white px-3 py-2">
                <Text className="text-[11px] font-bold text-secondary">{actionLabel}</Text>
              </View>
            ) : null}
          </View>

          <View>
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/14">
              <Ionicons name="location" size={24} color="#FFFFFF" />
            </View>
            <Text className="text-xl font-bold text-white">{title}</Text>
            {subtitle ? (
              <Text className="mt-2 text-sm leading-6 text-white/82">{subtitle}</Text>
            ) : null}
          </View>
        </LinearGradient>
      </ImageBackground>
    </MapCardShell>
  );
}
