import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getAuthState, getInitialAuthState, initializeSession, refreshSession, subscribeAuth } from '@/auth/member-session';

export function useAuthSession() {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  useEffect(() => { void initializeSession(); }, []);
  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.session) return;
    const refresh = () => { void refreshSession(); };
    const timer = setTimeout(refresh, Math.max(0, auth.session.accessExpiresAt - Date.now() - 30_000));
    const subscription = AppState.addEventListener('change', (next) => {
      const session = getAuthState().session;
      if (next === 'active' && session && session.accessExpiresAt <= Date.now() + 30_000) refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [auth.status, auth.session]);
  return auth;
}
