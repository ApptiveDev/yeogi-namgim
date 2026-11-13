import { useIsFocused } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MOTION_NATIVE_DRIVER, UI_MOTION } from '@/constants/ui-motion';
import { useMotionPreference } from '@/hooks/use-motion-preference';

type Props = {
  accessibilityLabel: string;
  color: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
};

export function LoadingSpinner({ accessibilityLabel, color, style, active = true }: Props) {
  const focused = useIsFocused();
  const reduceMotion = useMotionPreference();
  const [rotation] = useState(() => new Animated.Value(0));
  const busy = active && focused;
  const spinning = busy && !reduceMotion;

  useLayoutEffect(() => {
    rotation.setValue(0);
    if (!spinning) return;
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: UI_MOTION.spinner.revolution,
      easing: Easing.linear,
      useNativeDriver: MOTION_NATIVE_DRIVER,
      isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [rotation, spinning]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy }} style={[s.container, style]}>
      <Animated.View
        style={[s.ring, { borderColor: color }, spinning && {
          borderRightColor: 'transparent',
          transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
});
