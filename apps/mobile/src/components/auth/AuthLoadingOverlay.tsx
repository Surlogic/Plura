import React from 'react';
import { Animated, Easing, Image, Modal, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

type AuthLoadingOverlayProps = {
  visible: boolean;
  title: string;
  description?: string;
};

export default function AuthLoadingOverlay({
  visible,
  title,
  description,
}: AuthLoadingOverlayProps) {
  const scale = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (!visible) {
      scale.stopAnimation();
      scale.setValue(0.9);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      scale.stopAnimation();
    };
  }, [scale, visible]);

  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <LinearGradient
        colors={theme.gradients.heroElevated}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View
            className="h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-white/10"
            style={{ transform: [{ scale }] }}
          >
            <Image
              source={require('../../../assets/icon.png')}
              className="h-28 w-28"
              resizeMode="contain"
            />
          </Animated.View>

          <Text className="mt-8 text-center text-3xl font-semibold text-white">
            {title}
          </Text>

          {description ? (
            <Text className="mt-4 max-w-xs text-center text-base leading-6 text-white/80">
              {description}
            </Text>
          ) : null}

          <View
            className="mt-6 rounded-full px-4 py-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
          >
            <Text style={{ color: theme.colors.primaryLight, fontWeight: '700', fontSize: 12 }}>
              Plura sincronizando tu acceso
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}
