import { useLayoutEffect, useState } from 'react';
import { Animated } from 'react-native';

import { MOTION_EASING, MOTION_NATIVE_DRIVER, UI_MOTION } from '@/constants/ui-motion';
import { useMotionPreference } from '@/hooks/use-motion-preference';

// Retain content for the exit transition and disable interaction as soon as it closes.
export function useVisibilityMotion<T>(value: T | null, { enter, exit, exitEasing = MOTION_EASING.exit }: {
  enter: number;
  exit: number;
  exitEasing?: (progress: number) => number;
}) {
  const reduceMotion = useMotionPreference();
  const visible = value !== null;
  const [retained, setRetained] = useState(value);
  const [progress] = useState(() => new Animated.Value(reduceMotion && visible ? 1 : 0));
  if (visible && value !== retained) setRetained(value);
  if (!visible && reduceMotion && retained !== null) setRetained(null);
  const content = value ?? (reduceMotion ? null : retained);
  const mounted = content !== null;

  useLayoutEffect(() => {
    const toValue = visible ? 1 : 0;
    if (reduceMotion || !mounted) {
      progress.setValue(toValue);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue,
      duration: visible ? enter : exit,
      easing: visible ? MOTION_EASING.enter : exitEasing,
      useNativeDriver: MOTION_NATIVE_DRIVER,
      isInteraction: false,
    });
    let active = true;
    animation.start(({ finished }) => {
      if (active && finished && !visible) setRetained(null);
    });
    return () => {
      active = false;
      animation.stop();
    };
  }, [enter, exit, exitEasing, mounted, progress, reduceMotion, visible]);

  return {
    content,
    progress,
    opacity: reduceMotion ? 1 : progress,
    reduceMotion,
    interactionProps: {
      pointerEvents: visible ? 'auto' : 'none',
      accessibilityElementsHidden: !visible,
      importantForAccessibility: visible ? 'auto' : 'no-hide-descendants',
    } as const,
  };
}

export function useSlideMotion<T>(value: T | null, distance: number, timing: { enter: number; exit: number }) {
  const motion = useVisibilityMotion(value, timing);
  const translateY = motion.reduceMotion ? 0 : motion.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });
  return { ...motion, slideStyle: { transform: [{ translateY }] } };
}

export function usePopupMotion<T>(value: T | null) {
  const motion = useVisibilityMotion(value, UI_MOTION.popup);
  const visible = value !== null;
  const mounted = motion.content !== null;
  const [scale] = useState(() => new Animated.Value(UI_MOTION.popup.initialScale));

  useLayoutEffect(() => {
    if (!mounted) {
      scale.setValue(UI_MOTION.popup.initialScale);
      return;
    }
    if (motion.reduceMotion) {
      scale.setValue(1);
      return;
    }
    // Keep the current scale during dismissal so a fast close does not jump in size.
    if (!visible) return;
    const animation = Animated.timing(scale, {
      toValue: 1,
      duration: UI_MOTION.popup.enter,
      easing: MOTION_EASING.enter,
      useNativeDriver: MOTION_NATIVE_DRIVER,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [mounted, motion.reduceMotion, scale, visible]);

  return { ...motion, scale };
}
