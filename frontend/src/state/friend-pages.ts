import { ApiError } from '../api/client';
import { getFriendActivities, getFriends, type FriendActivitiesPage, type FriendsPage } from '../api/friends';
import { runMemberRequest } from '../auth/member-session';
import type { FriendActivity, FriendProfile } from '../types/friends';
import { friendErrorMessage } from '../utils/friends';
import { createMemberCache, getMemberOwner } from './member-cache';

type Page = { page: number; hasNext: boolean };
type Mode = 'background' | 'refresh' | 'more';
const EMPTY_ITEMS: readonly never[] = [];
const MAX_PAGE = 10_000;

type Snapshot<Item> = {
  items: readonly Item[];
  hasLoaded: boolean;
  hasNext: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export const EMPTY_FRIEND_PAGE: Snapshot<never> = {
  items: EMPTY_ITEMS, hasLoaded: false, hasNext: false, loading: false, refreshing: false, error: null,
};

function createFriendPageStore<Item extends { id: string }, Response extends Page>(
  owner: number | null,
  getPage: (token: string, page: number) => Promise<Response>,
  toItems: (page: Response) => readonly Item[],
  equal: (previous: Item, incoming: Item) => boolean,
  { discardUnverifiedOnError = false } = {},
) {
  let snapshot: Snapshot<Item> = EMPTY_FRIEND_PAGE;
  let lastPage = -1;
  let retryMode: 'refresh' | 'more' = 'refresh';
  let pending: { mode: Mode; done: Promise<void> } | null = null;
  const listeners = new Set<() => void>();

  function update(patch: Partial<Snapshot<Item>>) {
    if ((Object.keys(patch) as (keyof Snapshot<Item>)[]).every((key) => snapshot[key] === patch[key])) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  function load(mode: Mode): Promise<void> {
    if (owner === null || owner !== getMemberOwner() || (mode === 'more' && !snapshot.hasNext)) return Promise.resolve();
    if (pending && mode !== 'refresh') {
      if (mode === 'more' && pending.mode === 'background') {
        return pending.done.then(() => load('more'));
      }
      return pending.done;
    }

    const start = mode === 'more' ? lastPage + 1 : 0;
    const end = mode === 'more' ? start : Math.max(0, lastPage);
    const request = { mode, done: fetchPages() };
    pending = request;
    if (mode !== 'background' || !snapshot.hasLoaded) {
      update({ loading: mode === 'more' || !snapshot.hasLoaded, refreshing: mode === 'refresh' && snapshot.hasLoaded, error: null });
    }
    return request.done;

    async function fetchPages(): Promise<void> {
      const isCurrent = () => pending === request && owner === getMemberOwner();
      const previous = snapshot.items;
      const oldById = new Map(previous.map((item) => [item.id, item]));
      const byId = mode === 'more' ? new Map(oldById) : new Map<string, Item>();
      let page = start;
      let hasNext = false;
      try {
        for (; page <= end; page += 1) {
          const result = await runMemberRequest((token) => getPage(token, page));
          if (!isCurrent()) return;
          for (const item of toItems(result)) {
            const old = oldById.get(item.id);
            byId.set(item.id, old && equal(old, item) ? old : item);
          }
          hasNext = result.hasNext && page < MAX_PAGE;
          if (!hasNext || page === end) break;
        }
        const items = [...byId.values()];
        lastPage = page;
        update({
          items: items.length === previous.length && items.every((item, index) => item === previous[index]) ? previous : items,
          hasLoaded: true, hasNext, loading: false, refreshing: false, error: null,
        });
      } catch (error) {
        if (!isCurrent()) return;
        const forbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);
        let retained: Partial<Snapshot<Item>> = {};
        if (forbidden) {
          lastPage = -1;
          retained = EMPTY_FRIEND_PAGE;
        } else if (discardUnverifiedOnError && mode !== 'more') {
          // Retry from the failed page and display only the pages confirmed by this revalidation.
          lastPage = page - 1;
          retained = { items: [...byId.values()], hasLoaded: lastPage >= 0, hasNext };
        }
        retryMode = !forbidden && (mode === 'more' || retained.hasNext) ? 'more' : 'refresh';
        update({ ...retained, loading: false, refreshing: false, error: friendErrorMessage(error) });
      } finally {
        if (pending === request) pending = null;
      }
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    revalidate: () => load('background'),
    reload: () => load('refresh'),
    loadMore: () => load('more'),
    retry: () => load(retryMode),
  };
}

export type FriendPageStore<Item extends { id: string }> = ReturnType<typeof createFriendPageStore<Item, Page>>;

function friendProfile(id: string, displayName: string): FriendProfile {
  return { id, displayName, avatarUrl: null };
}

function sameFriend(a: FriendProfile, b: FriendProfile) {
  return a.id === b.id && a.displayName === b.displayName;
}

function friendsFromPage({ friends }: FriendsPage) {
  return friends.map(({ friendId, nickname }) => friendProfile(friendId, nickname));
}

function activitiesFromPage({ activities }: FriendActivitiesPage): FriendActivity[] {
  return activities.map(({ noteId, friendId, nickname, placeName, neighborhood, createdAt }) => ({
    id: noteId,
    friend: friendProfile(friendId, nickname),
    locationLabel: placeName?.trim() || neighborhood?.trim() || '장소 정보 없음',
    createdAtMs: Date.parse(createdAt),
  }));
}

function sameActivity(a: FriendActivity, b: FriendActivity) {
  return sameFriend(a.friend, b.friend) && a.locationLabel === b.locationLabel && a.createdAtMs === b.createdAtMs;
}

export const getFriendPages = createMemberCache((owner) => ({
  friends: createFriendPageStore(owner, getFriends, friendsFromPage, sameFriend),
  activities: createFriendPageStore(owner, getFriendActivities, activitiesFromPage, sameActivity, { discardUnverifiedOnError: true }),
}));
