import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

function subscribe(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, Appearance.getColorScheme, () => 'light' as const);
}
