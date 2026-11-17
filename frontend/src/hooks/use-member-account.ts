import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { subscribeAuth } from '@/auth/member-session';
import { getMemberAccount } from '@/state/member-account';

export function useMemberAccount({ includeStats = false } = {}) {
  const account = useSyncExternalStore(subscribeAuth, getMemberAccount, getMemberAccount);
  const profile = useSyncExternalStore(account.profile.subscribe, account.profile.getSnapshot, account.profile.getSnapshot);
  const stats = useSyncExternalStore(account.stats.subscribe, account.stats.getSnapshot, account.stats.getSnapshot);

  useFocusEffect(useCallback(() => {
    void account.profile.load(true).catch(() => {});
    if (includeStats) void account.stats.load(true).catch(() => {});
  }, [account, includeStats]));

  return {
    profile,
    stats,
    reload: () => { void account.profile.load().catch(() => {}); },
    reloadStats: () => { void account.stats.load().catch(() => {}); },
  };
}
