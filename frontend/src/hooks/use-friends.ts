import { useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { subscribeAuth } from '@/auth/member-session';
import { EMPTY_FRIEND_PAGE, getFriendPages, type FriendPageStore } from '@/state/friend-pages';

function useFriendPage<Item extends { id: string }>(enabled: boolean, store: FriendPageStore<Item>) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_FRIEND_PAGE);

  useFocusEffect(useCallback(() => {
    if (enabled) void store.revalidate();
  }, [enabled, store]));

  return { ...(enabled ? state : EMPTY_FRIEND_PAGE), reload: store.reload, loadMore: store.loadMore, retry: store.retry };
}

export function useFriends(enabled: boolean) {
  const { friends } = useSyncExternalStore(subscribeAuth, getFriendPages, getFriendPages);
  const { items, ...page } = useFriendPage(enabled, friends);
  return { ...page, friends: items };
}

export function useFriendActivities(enabled: boolean) {
  const { activities } = useSyncExternalStore(subscribeAuth, getFriendPages, getFriendPages);
  const { items, ...page } = useFriendPage(enabled, activities);
  return { ...page, activities: items };
}
