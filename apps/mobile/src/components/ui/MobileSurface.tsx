import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'light';
type ButtonTone = 'primary' | 'secondary' | 'soft' | 'danger' | 'light';

type ActionButtonProps = {
  label: string;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
  tone?: ButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type StatusPillProps = {
  label: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
};

type ScreenHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  badges?: Array<{ label: string; tone?: PillTone }>;
  primaryAction?: ActionButtonProps;
  secondaryAction?: ActionButtonProps;
  style?: StyleProp<ViewStyle>;
  gradientColors?: readonly [string, string, ...string[]];
};

type SectionCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  soft?: boolean;
};

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onActionPress?: (() => void) | undefined;
};

type MessageCardProps = {
  message: string;
  tone?: Exclude<PillTone, 'light'>;
  style?: StyleProp<ViewStyle>;
};

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onActionPress?: (() => void) | undefined;
};

const pillToneMap: Record<PillTone, { backgroundColor: string; textColor: string }> = {
  neutral: { backgroundColor: '#EEF4F7', textColor: theme.colors.secondary },
  primary: { backgroundColor: 'rgba(12,122,104,0.14)', textColor: theme.colors.primaryStrong },
  success: { backgroundColor: 'rgba(21,138,93,0.14)', textColor: theme.colors.success },
  warning: { backgroundColor: 'rgba(185,120,32,0.16)', textColor: theme.colors.warning },
  danger: { backgroundColor: 'rgba(196,79,97,0.16)', textColor: theme.colors.danger },
  light: { backgroundColor: 'rgba(255,255,255,0.16)', textColor: theme.colors.white },
};

const buttonToneMap: Record<ButtonTone, { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
    textColor: theme.colors.white,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    textColor: theme.colors.secondary,
  },
  soft: {
    backgroundColor: theme.colors.surfaceTint,
    borderColor: theme.colors.border,
    textColor: theme.colors.secondary,
  },
  danger: {
    backgroundColor: '#FFF5F6',
    borderColor: '#F3C8CF',
    textColor: theme.colors.danger,
  },
  light: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.18)',
    textColor: theme.colors.white,
  },
};

export function SectionCard({ children, style, soft = false }: SectionCardProps) {
  return <View style={[styles.card, soft ? styles.softCard : null, style]}>{children}</View>;
}

export function StatusPill({ label, tone = 'neutral', style }: StatusPillProps) {
  const toneStyles = pillToneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyles.backgroundColor }, style]}>
      <Text style={[styles.pillText, { color: toneStyles.textColor }]}>{label}</Text>
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
  style,
  textStyle,
}: ActionButtonProps) {
  const toneStyles = buttonToneMap[disabled ? 'secondary' : tone];
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: toneStyles.backgroundColor,
          borderColor: toneStyles.borderColor,
          opacity: disabled ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: toneStyles.textColor }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ScreenHero({
  eyebrow,
  title,
  description,
  icon,
  badges = [],
  primaryAction,
  secondaryAction,
  style,
  gradientColors = theme.gradients.heroElevated,
}: ScreenHeroProps) {
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroDescription}>{description}</Text>
        </View>
        {icon ? (
          <View style={styles.heroIconWrap}>
            <Ionicons name={icon} size={22} color={theme.colors.white} />
          </View>
        ) : null}
      </View>

      {badges.length > 0 ? (
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <StatusPill key={badge.label} label={badge.label} tone={badge.tone || 'light'} />
          ))}
        </View>
      ) : null}

      {primaryAction || secondaryAction ? (
        <View style={styles.actionRow}>
          {primaryAction ? <ActionButton {...primaryAction} tone={primaryAction.tone || 'secondary'} style={[styles.actionButton, primaryAction.style]} /> : null}
          {secondaryAction ? <ActionButton {...secondaryAction} tone={secondaryAction.tone || 'light'} style={[styles.actionButton, secondaryAction.style]} /> : null}
        </View>
      ) : null}
    </LinearGradient>
  );
}

export function SectionHeader({ eyebrow, title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function MessageCard({ message, tone = 'neutral', style }: MessageCardProps) {
  return (
    <SectionCard style={[styles.messageCard, style]} soft>
      <StatusPill
        label={
          tone === 'danger'
            ? 'Atencion'
            : tone === 'warning'
              ? 'Importante'
              : tone === 'success'
                ? 'Listo'
                : tone === 'primary'
                  ? 'Actualizacion'
                  : 'Info'
        }
        tone={tone}
      />
      <Text style={styles.messageText}>{message}</Text>
    </SectionCard>
  );
}

export function EmptyState({
  title,
  description,
  icon = 'sparkles-outline',
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  return (
    <SectionCard style={styles.emptyState} soft>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={24} color={theme.colors.secondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onActionPress ? (
        <ActionButton label={actionLabel} onPress={onActionPress} style={styles.emptyAction} />
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceStrong,
    padding: 20,
    ...theme.shadow.card,
  },
  softCard: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  hero: {
    borderRadius: 30,
    padding: 24,
    overflow: 'hidden',
    ...theme.shadow.lift,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroCopy: {
    flex: 1,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 10,
    color: theme.colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  button: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.inkFaint,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  messageCard: {
    gap: 10,
  },
  messageText: {
    color: theme.colors.secondary,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.inkMuted,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 18,
    minWidth: 180,
  },
});
