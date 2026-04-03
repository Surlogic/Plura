import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { theme } from '../../theme';

type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  fillInnerShell?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
};

export function AppScreen({
  children,
  scroll = false,
  edges = ['top'],
  style,
  contentContainerStyle,
  fillInnerShell = false,
  scrollProps,
}: AppScreenProps) {
  const innerShellStyle = [styles.innerShell, fillInnerShell ? styles.innerShellFill : null];

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      {...scrollProps}
    >
      <View style={innerShellStyle}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>
      <View style={innerShellStyle}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      <View style={styles.container}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient colors={theme.gradients.backgroundWash} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={theme.gradients.glowCyan}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowTopLeft}
          />
          <LinearGradient
            colors={theme.gradients.glowGreen}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowTopRight}
          />
          <LinearGradient
            colors={theme.gradients.glowPurple}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glowBottom}
          />
        </View>
        {content}
      </View>
    </SafeAreaView>
  );
}

export const surfaceStyles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceStrong,
    ...theme.shadow.card,
  },
  softCard: {
    borderRadius: theme.radii.panel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    ...theme.shadow.card,
  },
  heroCard: {
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadow.lift,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  innerShell: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    alignSelf: 'center',
  },
  innerShellFill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 124 : 112,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -110,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  glowTopRight: {
    position: 'absolute',
    top: -40,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  glowBottom: {
    position: 'absolute',
    right: -40,
    bottom: 70,
    width: 260,
    height: 260,
    borderRadius: 260,
  },
});
