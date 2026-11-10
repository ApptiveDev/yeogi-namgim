import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { getAuthState, getMemberSessionKey, subscribeAuth } from '@/auth/member-session';
import { archiveDayCount, filterArchiveNotes } from '@/data/archive';
import { getArchiveCache } from '@/state/archive-notes';
import type { StorageFilter, StorageFilterCounts } from '@/types/storage';

function getOwner() {
  return getAuthState().status === 'authenticated' ? getMemberSessionKey() : null;
}

export function useArchiveNotes(month: string, date: string | null, filter: StorageFilter) {
  const owner = useSyncExternalStore(subscribeAuth, getOwner, () => null);
  const type = filter === 'mine' ? 'WRITTEN' : filter === 'saved' ? 'SAVED' : 'ALL';
  const enabled = filter !== 'friends';
  const focused = useIsFocused();
  const cache = useMemo(() => getArchiveCache(owner), [owner]);
  const store = useMemo(() => cache.get({ month, date, type: 'ALL' }), [cache, month, date]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const readCalendar = useCallback(() => cache.getCalendar(month), [cache, month]);
  const calendar = useSyncExternalStore(cache.subscribe, readCalendar, () => null);
  const refresh = useCallback(() => { cache.invalidate(); return store.refresh(); }, [cache, store]);

  // Only navigation focus invalidates the cache. Local filter changes keep the
  // same store and never start a fresh request.
  useEffect(() => {
    if (focused && owner !== null) cache.invalidate();
  }, [cache, focused, owner]);

  useEffect(() => {
    if (!focused || !enabled || owner === null) return;
    void store.ensureLoaded();
  }, [store, enabled, owner, focused]);

  const { counts, markedDates } = useMemo(() => {
    const counts: Partial<StorageFilterCounts> = {};
    const markedDates = new Set<string>();
    if (calendar) {
      counts.mine = 0;
      counts.saved = 0;
      for (const day of calendar.days) {
        counts.mine += day.writtenCount;
        counts.saved += day.savedCount;
        if (archiveDayCount(day, type) > 0) markedDates.add(day.date);
      }
      counts.all = counts.mine + counts.saved;
    }
    return { counts, markedDates };
  }, [calendar, type]);
  const notes = useMemo(() => filterArchiveNotes(state.notes, filter), [filter, state.notes]);
  return { ...state, notes, counts, markedDates, refresh, loadMore: store.loadMore, retry: store.retry };
}
