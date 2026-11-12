import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';

import { MOTION_NATIVE_DRIVER, UI_MOTION } from '@/constants/ui-motion';
import { useMotionPreference } from '@/hooks/use-motion-preference';

export function SelectionPulse({ selected, children }: { selected: boolean; children: ReactNode }) {
  const reduceMotion = useMotionPreference();
  const wasSelected = useRef(selected);
  const [scale] = useState(() => new Animated.Value(1));

  useLayoutEffect(() => {
    const justSelected = selected && !wasSelected.current;
    wasSelected.current = selected;
    if (reduceMotion || !justSelected) {
      scale.setValue(1);
      return;
    }
    const { initialScale, ...spring } = UI_MOTION.selection;
    scale.setValue(initialScale);
    const animation = Animated.spring(scale, {
      ...spring,
      toValue: 1,
      useNativeDriver: MOTION_NATIVE_DRIVER,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, scale, selected]);

  return <Animated.View style={{ transform: [{ scale: reduceMotion ? 1 : scale }] }}>{children}</Animated.View>;
}
