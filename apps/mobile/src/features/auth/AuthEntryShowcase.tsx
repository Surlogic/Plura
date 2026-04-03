import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
      <LinearGradient colors={['#0A7A43', '#086537', '#162033']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(142, 219, 99, 0.22)', 'rgba(142, 219, 99, 0)']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0, y: 1 }}
        style={styles.glowRight}
      />
      <LinearGradient
        colors={['rgba(10, 122, 67, 0.28)', 'rgba(10, 122, 67, 0)']}
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
              <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8EDB63]">
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
                  colors={['#F2F8F2', '#D8EFCB', '#A9D59A']}
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
                      <View className="rounded-full bg-[#EEF8F1] px-2 py-1 self-start">
                        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#0A7A43]">
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
                      className="items-center justify-center rounded-full bg-[#EEF8F1]"
                      style={{ width: 36 * frameScale, height: 36 * frameScale }}
                    >
                      <Ionicons name="sparkles" size={Math.max(15, 18 * frameScale)} color="#0A7A43" />
                    </View>
                  </View>

                  <View className="mt-4 flex-row" style={{ gap: 8 * frameScale }}>
                    <View style={styles.metricPill}>
                      <Ionicons name="compass-outline" size={14} color="#0A7A43" />
                      <Text style={styles.metricText}>Explorar</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Ionicons name="calendar-outline" size={14} color="#0A7A43" />
                      <Text style={styles.metricText}>Reservar</Text>
                    </View>
                    <View style={styles.metricPill}>
                      <Ionicons name="storefront-outline" size={14} color="#0A7A43" />
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
          <Link href="/(auth)/login-client" asChild>
            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Reserva ya</Text>
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
    top: -40,
    right: -10,
    width: 260,
    height: 260,
    borderRadius: 260,
  },
  glowLeft: {
    position: 'absolute',
    top: 60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
  },
  mockupWrap: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideFigureLeft: {
    position: 'absolute',
    left: -14,
    top: 44,
    width: 112,
    height: 240,
    borderRadius: 56,
    backgroundColor: 'rgba(10, 122, 67, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sideFigureRight: {
    position: 'absolute',
    right: -10,
    top: 32,
    width: 128,
    height: 254,
    borderRadius: 64,
    backgroundColor: 'rgba(142, 219, 99, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  phoneFrame: {
    width: 248,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(191, 208, 215, 0.9)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  mapArea: {
    height: 214,
    position: 'relative',
  },
  routeSegment: {
    position: 'absolute',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#0A7A43',
  },
  routeDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#0A7A43',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  phoneBody: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardCopy: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#516072',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#F6FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  bar: {
    flex: 1,
    minWidth: 14,
    borderRadius: 999,
    backgroundColor: '#D9E6E8',
  },
  barHighlight: {
    backgroundColor: '#0A7A43',
  },
  actions: {
    paddingTop: 12,
    gap: 12,
  },
  heroTitle: {
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 42,
  },
  heroCopy: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.72)',
  },
  primaryButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#0A7A43',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(191, 208, 215, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

function scaledSegment(top: number, left: number, width: number, rotate: number, scale: number) {
  return {
    top: Math.round(top * scale),
    left: Math.round(left * scale),
    width: Math.round(width * scale),
    height: Math.max(4, 5 * scale),
    transform: [{ rotate: `${rotate}deg` }],
  };
}

function scaledDot(top: number, left: number, scale: number) {
  const size = Math.max(10, 12 * scale);
  return {
    top: Math.round(top * scale),
    left: Math.round(left * scale),
    width: size,
    height: size,
    borderRadius: size / 2,
  };
}
