import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'yeogi.dev.useMockData';

type DeveloperSettings = {
  mockDataEnabled: boolean;
  isReady: boolean;
  isSaving: boolean;
  error: string | null;
};

const initialSettings: DeveloperSettings = {
  mockDataEnabled: true,
  isReady: false,
  isSaving: false,
  error: null,
};

let settings = initialSettings;
let initialization: Promise<void> | undefined;
const listeners = new Set<() => void>();

function updateSettings(update: Partial<DeveloperSettings>) {
  settings = { ...settings, ...update };
  listeners.forEach((listener) => listener());
}

export function subscribeDeveloperSettings(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getDeveloperSettings() {
  return settings;
}

export function getInitialDeveloperSettings() {
  return initialSettings;
}

export function initializeDeveloperSettings() {
  initialization ??= (async () => {
    try {
      const stored = Platform.OS === 'web'
        ? globalThis.localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
      updateSettings({ mockDataEnabled: stored !== 'false', isReady: true });
    } catch {
      updateSettings({ isReady: true, error: '설정을 불러오지 못했어요. 기본값으로 시작해요.' });
    }
  })();
  return initialization;
}

export async function setMockDataEnabled(enabled: boolean) {
  await initializeDeveloperSettings();
  if (settings.isSaving || settings.mockDataEnabled === enabled) return;

  const previous = settings.mockDataEnabled;
  updateSettings({ mockDataEnabled: enabled, isSaving: true, error: null });
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage.setItem(STORAGE_KEY, String(enabled));
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, String(enabled));
    }
    updateSettings({ isSaving: false });
  } catch {
    updateSettings({ mockDataEnabled: previous, isSaving: false, error: '설정을 저장하지 못했어요. 다시 시도해 주세요.' });
  }
}
