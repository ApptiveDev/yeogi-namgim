import { Easing, Platform } from 'react-native';

export const MOTION_NATIVE_DRIVER = Platform.OS !== 'web';

export const MOTION_EASING = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
};

export const UI_MOTION = {
  toast: { enter: 160, exit: 140, hold: 3000 },
  popup: { enter: 220, exit: 150, initialScale: 0.94 },
  snackbar: { enter: 220, exit: 160 },
  text: { duration: 160, lineDelay: 50 },
  spinner: { revolution: 800 },
  selection: { initialScale: 1.16, stiffness: 280, damping: 16, mass: 0.65 },
} as const;
