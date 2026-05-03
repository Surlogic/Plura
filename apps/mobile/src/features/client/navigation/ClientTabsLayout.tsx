import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '../../../lib/icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSession } from '../../../context/auth/AuthSessionContext';
import { theme } from '../../../theme';

function TabIcon({
  name,
  color,
  focused,
  size = 24,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
  size?: number;
}) {
  return (
    <View style={[styles.iconShell, focused ? styles.iconShellActive : null]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export default function ClientTabsLayout() {
  const { hasLoaded, role } = useAuthSession();
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = Platform.OS === 'ios' ? 60 : 58;
  const tabBarHorizontalInset = Platform.OS === 'web' ? 14 : 0;
  const tabBarBottomOffset =
    Platform.OS === 'web'
      ? 10
      : 0;
  const tabBarBottomPadding =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 10)
      : Platform.OS === 'web'
        ? 10
        : Math.max(insets.bottom, 30);

  if (!hasLoaded) {
    return null;
  }

  if (role === 'professional') {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.inkFaint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(15, 23, 42, 0.06)',
          borderTopLeftRadius: Platform.OS === 'web' ? 28 : 0,
          borderTopRightRadius: Platform.OS === 'web' ? 28 : 0,
          borderBottomLeftRadius: Platform.OS === 'web' ? 28 : 0,
          borderBottomRightRadius: Platform.OS === 'web' ? 28 : 0,
          position: 'absolute',
          overflow: 'hidden',
          elevation: 6,
          shadowColor: theme.colors.ink,
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -4 },
          height: baseTabBarHeight + tabBarBottomPadding,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 4,
          marginHorizontal: 0,
          bottom: tabBarBottomOffset,
          alignSelf: Platform.OS === 'web' ? 'center' : undefined,
          width: Platform.OS === 'web' ? '100%' : undefined,
          maxWidth: Platform.OS === 'web' ? 560 : undefined,
          left: Platform.OS === 'web' ? 0 : tabBarHorizontalInset,
          right: Platform.OS === 'web' ? 0 : tabBarHorizontalInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: 0,
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'MAPA',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} size={25} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} size={23} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    minHeight: 26,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  iconShellActive: {
    backgroundColor: theme.colors.primarySoft,
  },
});
