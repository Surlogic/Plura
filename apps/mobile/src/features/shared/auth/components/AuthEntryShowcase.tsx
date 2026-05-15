import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../../../lib/icons';
import { theme } from '../../../../theme';

export function AuthEntryShowcase() {
  const { width, height } = useWindowDimensions();
  const contentPadding = width < 360 ? 18 : 24;
  const frameWidth = Math.min(248, Math.max(208, width * 0.62));
  const frameScale = frameWidth / 248;
  const mapHeight = Math.round(214 * frameScale);
  const mockupMinHeight = Math.round(320 + 110 * frameScale);
  const sideLeftWidth = Math.round(112 * frameScale);
  const sideLeftHeight = Math.round(240 * frameScale);
  const sideRightWidth = Math.round(128 * frameScale);
  const sideRightHeight = Math.round(254 * frameScale);
  const titleSize = width < 360 ? 34 : 31;
  const actionPaddingBottom = height < 760 ? 18 : 24;

  return (
    <View style={styles.shell}>
      <LinearGradient colors={theme.gradients.heroElevated} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(54, 200, 244, 0.18)', 'rgba(54, 200, 244, 0)']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0, y: 1 }}
        style={styles.glowRight}
      />
      <LinearGradient
        colors={['rgba(142, 219, 99, 0.18)', 'rgba(142, 219, 99, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowLeft}
      />

      <View style={[styles.content, { paddingHorizontal: contentPadding, paddingBottom: actionPaddingBottom }]}>
        <ScrollView
          style={styles.topScroll}
          contentContainerStyle={styles.topScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="flex-row items-center justify-between">
            <View className="rounded-full border border-white/12 bg-white/8 px-4 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[2px] text-white/72">
                Acceso mobile
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-2">
              <Text style={styles.brandPillText}>
                PLURA
              </Text>
            </View>
          </View>

          <View style={styles.centerBlock}>
            <View style={[styles.mockupWrap, { minHeight: mockupMinHeight }]}>
              <View
                style={[
                  styles.sideFigureLeft,
                  {
                    width: sideLeftWidth,
                    height: sideLeftHeight,
                    borderRadius: sideLeftWidth / 2,
                    top: Math.round(44 * frameScale),
                    left: Math.round(-14 * frameScale),
                  },
                ]}
              />
              <View
                style={[
                  styles.sideFigureRight,
                  {
                    width: sideRightWidth,
                    height: sideRightHeight,
                    borderRadius: sideRightWidth / 2,
                    top: Math.round(32 * frameScale),
                    right: Math.round(-10 * frameScale),
                  },
                ]}
              />

              <View style={[styles.phoneFrame, { width: frameWidth, borderRadius: 28 * frameScale }]}>
                <LinearGradient
                  colors={[theme.colors.surfaceStrong, theme.colors.backgroundMuted, theme.colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.mapArea, { height: mapHeight }]}
                >
                  <View style={[styles.routeSegment, scaledSegment(26, 58, 88, 18, frameScale)]} />
                  <View style={[styles.routeSegment, scaledSegment(52, 36, 76, -42, frameScale)]} />
                  <View style={[styles.routeSegment, scaledSegment(96, 76, 84, 34, frameScale)]} />
                  <View style={[styles.routeSegment, scaledSegment(132, 68, 62, -18, frameScale)]} />
                  <View style={[styles.routeDot, scaledDot(44, 106, frameScale)]} />
                  <View style={[styles.routeDot, scaledDot(112, 74, frameScale)]} />
                  <View style={[styles.routeDot, scaledDot(150, 120, frameScale)]} />
                </LinearGradient>

                <View style={[styles.phoneBody, { paddingHorizontal: 16 * frameScale, paddingVertical: 15 * frameScale }]}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>
                          Nuevo
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, { fontSize: Math.max(14, 16 * frameScale), marginTop: 8 * frameScale }]}>
                        Reservá o empezá tu negocio
                      </Text>
                      <Text style={[styles.cardCopy, { fontSize: Math.max(11, 12 * frameScale), lineHeight: Math.max(16, 18 * frameScale) }]}>
                        La entrada principal ahora prioriza los dos caminos clave desde mobile.
                      </Text>
                    </View>
                    <View
                      style={[styles.featureIconWrap, { width: 36 * frameScale, height: 36 * frameScale }]}
                    >
                      <Ionicons name="sparkles" size={Math.max(15, 18 * frameScale)} color={theme.colors.primary} />
                    </View>
                  </View>

                  <View className="mt-4 flex-row" style={{ gap: 8 * frameScale }}>
                    <View style={styles.metricPill}>
                      <Ionicons name="compass-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.metricText}>Explorar</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.metricText}>Reservar</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Ionicons name="storefront-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.metricText}>Publicar</Text>
                    </View>
                  </View>

                  <View className="mt-5">
                    <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-faint">
                      Actividad destacada
                    </Text>
                    <View className="mt-3 flex-row items-end" style={{ gap: 6 * frameScale }}>
                      {[54, 76, 82, 66, 98, 72, 48].map((height, index) => (
                        <View
                          key={index}
                          style={[
                            styles.bar,
                            {
                              height: Math.round(height * frameScale),
                              minWidth: Math.max(10, 14 * frameScale),
                            },
                            index === 4 ? styles.barHighlight : null,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.heroTitle,
                {
                  fontSize: titleSize,
                  lineHeight: width < 360 ? 38 : 42,
                },
              ]}
            >
              Elegí rápido entre reservar o activar tu negocio.
            </Text>
            <Text style={[styles.heroCopy, { maxWidth: Math.min(320, width - 88) }]}>
              Una sola portada inicial, con scroll arriba y dos acciones claras siempre visibles abajo.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/register-professional" asChild>
            <TouchableOpacity activeOpacity={0.86} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Registrá tu negocio</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  topScroll: {
    flex: 1,
  },
  topScrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  glowRight: {
    position: 'absolute',
    width: 320,
    height: 320,
    top: -40,
    right: -40,
    borderRadius: 320,
  },
  glowLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    bottom: 90,
    left: -70,
    borderRadius: 280,
  },
  mockupWrap: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideFigureLeft: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sideFigureRight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  phoneFrame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  mapArea: {
    position: 'relative',
    justifyContent: 'center',
  },
  routeSegment: {
    position: 'absolute',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  routeDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  phoneBody: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  newBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryStrong,
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  cardCopy: {
    marginTop: 6,
    color: theme.colors.inkMuted,
  },
  featureIconWrap: {
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: theme.colors.secondarySoft,
  },
  barHighlight: {
    backgroundColor: theme.colors.primary,
  },
  heroTitle: {
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '700',
    color: '#fff',
    maxWidth: 320,
  },
  heroCopy: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.82)',
  },
  actions: {
    gap: 12,
    paddingTop: 16,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  brandPillText: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: '#fff',
  },
});

const scaledSegment = (left: number, top: number, width: number, rotate: number, scale: number) => ({
  left: Math.round(left * scale),
  top: Math.round(top * scale),
  width: Math.round(width * scale),
  transform: [{ rotate: `${rotate}deg` }],
});

const scaledDot = (left: number, top: number, scale: number) => ({
  left: Math.round(left * scale),
  top: Math.round(top * scale),
});
