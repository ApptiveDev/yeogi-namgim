import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, type TextProps } from 'react-native';

import { MOTION_EASING, MOTION_NATIVE_DRIVER, UI_MOTION } from '@/constants/ui-motion';
import { useMotionPreference } from '@/hooks/use-motion-preference';

export function RevealText({ order = 0, style, ...props }: TextProps & { order?: number }) {
  const reduceMotion = useMotionPreference();
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const revealed = useRef(false);

  useLayoutEffect(() => {
    if (reduceMotion || revealed.current) {
      opacity.setValue(1);
      revealed.current = true;
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: 1,
      delay: order * UI_MOTION.text.lineDelay,
      duration: UI_MOTION.text.duration,
      easing: MOTION_EASING.enter,
      useNativeDriver: MOTION_NATIVE_DRIVER,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) revealed.current = true;
    });
    return () => animation.stop();
  }, [opacity, order, reduceMotion]);

  return <Animated.Text {...props} style={[style, { opacity: reduceMotion ? 1 : opacity }]} />;
}
