import { useEffect, useSyncExternalStore } from 'react';

import {
  getDeveloperSettings,
  getInitialDeveloperSettings,
  initializeDeveloperSettings,
  setMockDataEnabled,
  subscribeDeveloperSettings,
} from '@/state/developer-settings';

export function useDeveloperSettings() {
  const settings = useSyncExternalStore(subscribeDeveloperSettings, getDeveloperSettings, getInitialDeveloperSettings);

  useEffect(() => { void initializeDeveloperSettings(); }, []);

  return { ...settings, setMockDataEnabled };
}
