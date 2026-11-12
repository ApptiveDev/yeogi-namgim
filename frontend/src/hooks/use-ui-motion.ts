import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

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

export function useSheetDrag({ sheetKey, height, progress, reduceMotion, onDismiss }: {
  sheetKey: number | null;
  height: number;
  progress: Animated.Value;
  reduceMotion: boolean;
  onDismiss: () => void;
}) {
  const drag = useRef<{ startProgress: number | null; dy: number } | null>(null);
  const { panHandlers, cancelDrag } = useMemo(() => {
    function followFinger() {
      const current = drag.current;
      if (!current || current.startProgress === null) return;
      progress.setValue(Math.max(0, current.startProgress - Math.max(0, current.dy) / height));
    }

    function returnToOpen() {
      if (!drag.current) return;
      drag.current = null;
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: UI_MOTION.sheet.exit,
        easing: MOTION_EASING.enter,
        useNativeDriver: MOTION_NATIVE_DRIVER,
        isInteraction: false,
      }).start();
    }

    // PanResponder registers these callbacks now and reads the ref only during gestures.
    // eslint-disable-next-line react-hooks/refs
    const pan = PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy, numberActiveTouches }) => (
        sheetKey !== null && height > 0 && numberActiveTouches === 1 && dy > 8 && dy > Math.abs(dx)
      ),
      onPanResponderGrant: () => {
        const current = { startProgress: null, dy: 0 };
        drag.current = current;
        progress.stopAnimation((value) => {
          if (drag.current !== current) return;
          drag.current.startProgress = value;
          followFinger();
        });
      },
      onPanResponderMove: (_, { dy }) => {
        if (!drag.current) return;
        drag.current.dy = dy;
        followFinger();
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (!drag.current) return;
        if (dy >= 60 || (dy >= 16 && vy > 0.7)) {
          // Start the exit at the position where the finger released the sheet.
          drag.current = null;
          onDismiss();
        } else {
          returnToOpen();
        }
      },
      onPanResponderTerminate: returnToOpen,
    });

    return {
      panHandlers: pan.panHandlers,
      cancelDrag() {
        if (!drag.current) return;
        drag.current = null;
        progress.setValue(1);
      },
    };
  }, [height, onDismiss, progress, reduceMotion, sheetKey]);

  useLayoutEffect(() => cancelDrag, [cancelDrag]);
  return panHandlers;
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
