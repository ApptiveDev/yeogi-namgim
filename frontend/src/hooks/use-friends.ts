import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { getFriends } from '@/api/friends';
import { getAuthState, getInitialAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';
import type { FriendProfile } from '@/types/friends';
import { friendErrorMessage } from '@/utils/friends';

type FriendsState = { owner: number; friends: FriendProfile[]; page: number; hasNext: boolean; loading: boolean; error: string | null };

export function useFriends(enabled: boolean) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const generationRef = useRef(0);
  const busyRef = useRef<number | null>(null);
  const [state, setState] = useState<FriendsState>({ owner, friends: [], page: -1, hasNext: false, loading: enabled, error: null });

  const load = useCallback(async (page: number, replace: boolean, generation: number) => {
    if (!enabled || auth.status !== 'authenticated' || busyRef.current === generation) return;
    busyRef.current = generation;
    setState((previous) => ({ ...previous, ...(replace ? { owner, friends: [], page: -1, hasNext: false } : {}), loading: true, error: null }));
    try {
      const result = await runMemberRequest((token) => getFriends(token, page));
      if (generationRef.current !== generation || owner !== getMemberSessionKey()) return;
      const friends = result.friends.map((friend) => ({ id: friend.friendId, displayName: friend.nickname, avatarUrl: null }));
      setState((previous) => ({
        owner, friends: [...new Map((replace ? friends : [...previous.friends, ...friends]).map((friend) => [friend.id, friend])).values()],
        page: result.page, hasNext: result.hasNext, loading: false, error: null,
      }));
    } catch (error) {
      if (generationRef.current === generation && owner === getMemberSessionKey()) {
        setState((previous) => ({ ...previous, loading: false, error: friendErrorMessage(error) }));
      }
    } finally {
      if (busyRef.current === generation) busyRef.current = null;
    }
  }, [enabled, auth.status, owner]);

  const reload = useCallback(() => { void load(0, true, ++generationRef.current); }, [load]);
  useFocusEffect(useCallback(() => {
    reload();
    return () => { generationRef.current += 1; };
  }, [reload]));

  const loadMore = () => {
    if (!state.loading && state.hasNext && state.owner === owner && state.page < 10000) {
      void load(state.page + 1, false, generationRef.current);
    }
  };
  return {
    ...(state.owner === owner && enabled ? state : { owner, friends: [], page: -1, hasNext: false, loading: enabled, error: null }),
    reload, loadMore, retry: state.page < 0 ? reload : loadMore,
  };
}
