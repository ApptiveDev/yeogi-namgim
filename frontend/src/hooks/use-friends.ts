import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { getFriends, type Friend } from '@/api/friends';
import { getAuthState, getInitialAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';
import type { FriendProfile } from '@/types/friends';
import { friendErrorMessage } from '@/utils/friends';

type FriendsState = {
  owner: number;
  friends: readonly FriendProfile[];
  page: number;
  requestedPage: number;
  hasNext: boolean;
  loading: boolean;
  error: string | null;
};

const EMPTY_FRIENDS: readonly FriendProfile[] = [];

function emptyFriendsState(owner: number, loading: boolean): FriendsState {
  return { owner, friends: EMPTY_FRIENDS, page: -1, requestedPage: 0, hasNext: false, loading, error: null };
}

function mergeFriendPage(previous: readonly FriendProfile[], incoming: readonly Friend[], replace: boolean) {
  const previousById = new Map(previous.map((friend) => [friend.id, friend]));
  const nextById = replace ? new Map<string, FriendProfile>() : previousById;

  for (const { friendId, nickname } of incoming) {
    const existing = previousById.get(friendId);
    const profile = existing?.displayName === nickname
      ? existing
      : { id: friendId, displayName: nickname, avatarUrl: null };
    nextById.set(friendId, profile);
  }

  const next = [...nextById.values()];
  return next.length === previous.length && next.every((friend, index) => friend === previous[index])
    ? previous
    : next;
}

export function useFriends(enabled: boolean) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const generationRef = useRef(0);
  const busyRef = useRef<number | null>(null);
  const [state, setState] = useState(() => emptyFriendsState(owner, enabled));

  const load = useCallback(async (page: number, generation: number) => {
    if (!enabled || auth.status !== 'authenticated' || owner !== getMemberSessionKey() || busyRef.current === generation) return;
    busyRef.current = generation;
    setState((previous) => ({
      ...(previous.owner === owner ? previous : emptyFriendsState(owner, true)),
      requestedPage: page,
      loading: true,
      error: null,
    }));
    try {
      const result = await runMemberRequest((token) => getFriends(token, page));
      if (generationRef.current !== generation || owner !== getMemberSessionKey()) return;
      setState((previous) => ({
        owner,
        friends: mergeFriendPage(previous.owner === owner ? previous.friends : EMPTY_FRIENDS, result.friends, page === 0),
        page: result.page,
        requestedPage: page,
        hasNext: result.hasNext,
        loading: false,
        error: null,
      }));
    } catch (error) {
      if (generationRef.current === generation && owner === getMemberSessionKey()) {
        setState((previous) => ({ ...previous, loading: false, error: friendErrorMessage(error) }));
      }
    } finally {
      if (busyRef.current === generation) busyRef.current = null;
    }
  }, [enabled, auth.status, owner]);

  const reload = useCallback(() => { void load(0, ++generationRef.current); }, [load]);
  useFocusEffect(useCallback(() => {
    reload();
    return () => { generationRef.current += 1; };
  }, [reload]));

  const current = state.owner === owner && enabled ? state : emptyFriendsState(owner, enabled);
  const { friends, page, requestedPage, hasNext, loading, error } = current;
  const loadMore = useCallback(() => {
    if (!loading && hasNext && page < 10000) {
      void load(page + 1, generationRef.current);
    }
  }, [loading, hasNext, page, load]);

  return {
    friends,
    hasNext,
    hasLoaded: page >= 0,
    loading,
    error,
    refreshing: loading && requestedPage === 0 && page >= 0,
    reload,
    loadMore,
    retry: requestedPage === 0 ? reload : loadMore,
  };
}
