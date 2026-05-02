import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../../../lib/icons';
import { theme } from '../../../theme';

type WorkerNavItem = {
  href: '/trabajador/calendario' | '/trabajador/reservas' | '/trabajador/cuenta';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: WorkerNavItem[] = [
  {
    href: '/trabajador/calendario',
    label: 'Agenda',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  {
    href: '/trabajador/reservas',
    label: 'Reservas',
    icon: 'list-outline',
    activeIcon: 'list',
  },
  {
    href: '/trabajador/cuenta',
    label: 'Cuenta',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

const isActiveItem = (pathname: string, item: WorkerNavItem) => {
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.href}/`);
};

export function WorkerBottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 14)
      : Platform.OS === 'web'
        ? 14
        : Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            paddingBottom: bottomPadding,
            height: 62 + bottomPadding,
          },
        ]}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActiveItem(pathname, item);
          return (
            <TouchableOpacity
              key={item.href}
              activeOpacity={0.9}
              accessibilityRole="button"
              onPress={() => {
                if (pathname !== item.href) {
                  router.replace(item.href);
                }
              }}
              style={styles.item}
            >
              <View style={[styles.iconWrap, active ? styles.iconWrapActive : null]}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={20}
                  color={active ? theme.colors.primary : theme.colors.inkFaint}
                />
              </View>
              <Text style={[styles.label, active ? styles.labelActive : null]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  container: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    marginBottom: Platform.OS === 'ios' ? 12 : 10,
    marginHorizontal: Platform.OS === 'web' ? 0 : 14,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.inkFaint,
  },
  labelActive: {
    color: theme.colors.primary,
  },
});
