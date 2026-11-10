import { getArchiveCalendar, type ArchiveCalendar } from '../api/archive';
import { getAuthState, getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { archiveDates, loadArchivePage, type ArchivePosition, type ArchiveSelection } from '../data/archive';
import type { StorageNote } from '../types/storage';

type Snapshot = {
  calendar: ArchiveCalendar | null;
  notes: readonly StorageNote[];
  next: ArchivePosition | null;
  loading: boolean;
  error: string | null;
};

export function createArchiveStore(owner: number | null, selection: ArchiveSelection,
  readCalendar = () => runMemberRequest((token) => getArchiveCalendar(token, selection.month))) {
  let snapshot: Snapshot = { calendar: null, notes: [], next: null, loading: true, error: null };
  let pending: { refresh: boolean } | null = null;
  let stale = true;
  let retryRefresh = true;
  const listeners = new Set<() => void>();
  const isOwner = () => owner !== null && owner === getMemberSessionKey() && getAuthState().status === 'authenticated';

  function update(patch: Partial<Snapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  async function load(refresh: boolean) {
    if (!isOwner() || (pending && !refresh) || (!refresh && !snapshot.next)) return;
    const request = { refresh };
    pending = request;
    const isCurrent = () => pending === request && isOwner();
    const position = refresh ? { dayIndex: 0, cursor: null } : snapshot.next!;
    update({ loading: true, error: null });
    try {
      const calendar = refresh ? await readCalendar() : snapshot.calendar!;
      if (!isCurrent()) return;
      update({ calendar, next: position });
      const result = await loadArchivePage(selection, archiveDates(selection, calendar.days), position, isCurrent);
      if (!result || !isCurrent()) return;
      const byId = new Map((refresh ? [] : snapshot.notes).map((note) => [note.id, note]));
      result.notes.forEach((note) => byId.set(note.id, note));
      stale = false;
      update({ notes: [...byId.values()], next: result.next, loading: false });
    } catch (error) {
      if (isCurrent()) {
        retryRefresh = refresh;
        update({ loading: false, error: error instanceof Error ? error.message : '보관함을 불러오지 못했어요.' });
      }
    } finally {
      if (pending === request) pending = null;
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh: () => load(true),
    ensureLoaded: () => stale && !pending ? load(true) : Promise.resolve(),
    loadMore: () => load(false),
    retry: () => load(retryRefresh),
    invalidate() { stale = true; pending = null; },
  };
}

// Month/date selections share the calendar; all three filters share ALL pages.
export function createArchiveCache(owner: number | null) {
  const stores = new Map<string, ReturnType<typeof createArchiveStore>>();
  const calendars = new Map<string, ArchiveCalendar>();
  const requests = new Map<string, Promise<ArchiveCalendar>>();
  const listeners = new Set<() => void>();

  function readCalendar(month: string) {
    const cached = requests.get(month);
    if (cached) return cached;
    const promise = runMemberRequest((token) => getArchiveCalendar(token, month)).then((calendar) => {
      if (requests.get(month) === promise) {
        calendars.set(month, calendar);
        listeners.forEach((listener) => listener());
      }
      return calendar;
    }, (error: unknown) => {
      if (requests.get(month) === promise) requests.delete(month);
      throw error;
    });
    requests.set(month, promise);
    return promise;
  }

  return {
    get(selection: ArchiveSelection) {
      const key = JSON.stringify(selection);
      let store = stores.get(key);
      if (!store) {
        store = createArchiveStore(owner, selection, () => readCalendar(selection.month));
        stores.set(key, store);
      }
      return store;
    },
    getCalendar: (month: string) => calendars.get(month) ?? null,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate() {
      requests.clear();
      stores.forEach((store) => store.invalidate());
    },
  };
}

let activeCache: { owner: number | null; day: string; cache: ReturnType<typeof createArchiveCache> } | null = null;

// Memory only: the first archive visit after an app restart or a Seoul date
// change gets fresh data. Re-entering the tab on the same day keeps its pages.
export function getArchiveCache(owner: number | null, day: string) {
  if (!activeCache || activeCache.owner !== owner || activeCache.day !== day) {
    activeCache?.cache.invalidate();
    activeCache = { owner, day, cache: createArchiveCache(owner) };
  }
  return activeCache.cache;
}
