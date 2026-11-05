import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let message: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => message;
const serverSnapshot = () => null;

export function showToast(text: string) {
  clearTimeout(timer);
  message = text;
  listeners.forEach((listener) => listener());
  timer = setTimeout(() => {
    message = null;
    listeners.forEach((listener) => listener());
  }, 3000);
}

export function Toast({ visible = true }: { visible?: boolean }) {
  const text = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const insets = useSafeAreaInsets();
  if (!visible || !text) return null;
  return <View pointerEvents="none" style={[s.toast, { bottom: insets.bottom + 96 }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.text}>{text}</Text>
  </View>;
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 24, right: 24, zIndex: 100, padding: 14, borderRadius: 12, backgroundColor: '#2C2C2E' },
  text: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
