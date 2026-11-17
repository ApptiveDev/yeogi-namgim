import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const listeners = new Set<() => void>();
let preference: boolean | null = null;
let stopListening: (() => void) | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    let active = true;
    let receivedChange = false;
    const publish = (next: boolean) => {
      if (!active || preference === next) return;
      preference = next;
      listeners.forEach((notify) => notify());
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (next) => {
      receivedChange = true;
      publish(next);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((next) => {
      if (!receivedChange) publish(next);
    }).catch(() => {
      // Keep the last known setting if the platform query is unavailable.
    });
    stopListening = () => {
      active = false;
      subscription?.remove();
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopListening?.();
  };
}

const getPreference = () => preference;
const getServerPreference = () => null;

export function useMotionPreference() {
  const initialPreference = useReducedMotion();
  return useSyncExternalStore(subscribe, getPreference, getServerPreference) ?? initialPreference;
}
