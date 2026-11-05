import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { getFriendActivities, getFriends, type FriendActivitiesPage, type FriendsPage } from '@/api/friends';
import { getAuthState, getInitialAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';
import type { FriendActivity, FriendProfile } from '@/types/friends';
import { friendErrorMessage } from '@/utils/friends';

type Page = { page: number; hasNext: boolean };

type PageState<Item> = {
  owner: number;
  items: readonly Item[];
  page: number;
  requestedPage: number;
  hasNext: boolean;
  loading: boolean;
  error: string | null;
};

const EMPTY_ITEMS: readonly never[] = [];

function emptyPageState<Item>(owner: number, loading: boolean): PageState<Item> {
  return { owner, items: EMPTY_ITEMS, page: -1, requestedPage: 0, hasNext: false, loading, error: null };
}

function mergeFriendPage(previous: readonly FriendProfile[], { friends }: FriendsPage, replace: boolean) {
  const previousById = new Map(previous.map((friend) => [friend.id, friend]));
  const nextById = replace ? new Map<string, FriendProfile>() : previousById;

  for (const { friendId, nickname } of friends) {
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

function mergeActivityPage(previous: readonly FriendActivity[], { activities }: FriendActivitiesPage, replace: boolean) {
  const byId = new Map((replace ? EMPTY_ITEMS : previous).map((activity) => [activity.id, activity]));
  for (const { noteId, friendId, nickname, placeName, neighborhood, createdAt } of activities) {
    byId.set(noteId, {
      id: noteId,
      friend: { id: friendId, displayName: nickname, avatarUrl: null },
      locationLabel: placeName?.trim() || neighborhood?.trim() || '장소 정보 없음',
      createdAtMs: Date.parse(createdAt),
    });
  }
  return [...byId.values()];
}

function useFriendPages<Item, Response extends Page>(
  enabled: boolean,
  getPage: (token: string, page: number) => Promise<Response>,
  mergePage: (previous: readonly Item[], result: Response, replace: boolean) => readonly Item[],
) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const generationRef = useRef(0);
  const busyRef = useRef<number | null>(null);
  const [state, setState] = useState(() => emptyPageState<Item>(owner, enabled));

  const load = useCallback(async (page: number, generation: number) => {
    if (!enabled || auth.status !== 'authenticated' || owner !== getMemberSessionKey() || busyRef.current === generation) return;
    busyRef.current = generation;
    setState((previous) => ({
      ...(previous.owner === owner ? previous : emptyPageState<Item>(owner, true)),
      requestedPage: page,
      loading: true,
      error: null,
    }));
    try {
      const result = await runMemberRequest((token) => getPage(token, page));
      if (generationRef.current !== generation || owner !== getMemberSessionKey()) return;
      setState((previous) => ({
        owner,
        items: mergePage(previous.owner === owner ? previous.items : EMPTY_ITEMS, result, page === 0),
        page: result.page,
        requestedPage: page,
        hasNext: result.hasNext && result.page < 10000,
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
  }, [enabled, auth.status, owner, getPage, mergePage]);

  const reload = useCallback(() => { void load(0, ++generationRef.current); }, [load]);
  useFocusEffect(useCallback(() => {
    reload();
    return () => { generationRef.current += 1; };
  }, [reload]));

  const current = state.owner === owner && enabled ? state : emptyPageState<Item>(owner, enabled);
  const { items, page, requestedPage, hasNext, loading, error } = current;
  const loadMore = useCallback(() => {
    if (!loading && hasNext) {
      void load(page + 1, generationRef.current);
    }
  }, [loading, hasNext, page, load]);

  return {
    items,
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

export function useFriends(enabled: boolean) {
  const { items, ...page } = useFriendPages(enabled, getFriends, mergeFriendPage);
  return { ...page, friends: items };
}

export function useFriendActivities(enabled: boolean) {
  const { items, ...page } = useFriendPages(enabled, getFriendActivities, mergeActivityPage);
  return { ...page, activities: items };
}
