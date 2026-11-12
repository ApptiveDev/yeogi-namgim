import { getArchiveCalendar, type ArchiveCalendar } from '../api/archive';
import { getAuthState, getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { ARCHIVE_PAGE_SIZE, archiveDates, loadArchivePage, type ArchivePosition, type ArchiveSelection } from '../data/archive';
import type { StorageNote } from '../types/storage';

type Snapshot = {
  calendar: ArchiveCalendar | null;
  notes: readonly StorageNote[];
  next: ArchivePosition | null;
  hasLoaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

function sameCalendar(previous: ArchiveCalendar | null, incoming: ArchiveCalendar) {
  return previous?.month === incoming.month && previous.days.length === incoming.days.length
    && previous.days.every((day, index) => {
      const other = incoming.days[index];
      return day.date === other.date && day.writtenCount === other.writtenCount && day.savedCount === other.savedCount;
    });
}

const NOTE_FIELDS = ['id', 'title', 'createdAt', 'author', 'authorDisplayName', 'locationLabel', 'isSaved', 'thumbnailColor', 'openable'] as const satisfies readonly (keyof StorageNote)[];

function reconcileNotes(previous: readonly StorageNote[], incoming: readonly StorageNote[]) {
  const byId = new Map(previous.map((note) => [note.id, note]));
  const notes = incoming.map((note) => {
    const existing = byId.get(note.id);
    return existing && NOTE_FIELDS.every((field) => existing[field] === note[field]) ? existing : note;
  });
  return previous.length === notes.length && previous.every((note, index) => note === notes[index]) ? previous : notes;
}

export function createArchiveStore(owner: number | null, selection: ArchiveSelection,
  readCalendar = () => runMemberRequest((token) => getArchiveCalendar(token, selection.month))) {
  let snapshot: Snapshot = { calendar: null, notes: [], next: null, hasLoaded: false, loading: true, refreshing: false, error: null };
  let pending: { refresh: boolean } | null = null;
  let stale = true;
  let retryRefresh = true;
  const listeners = new Set<() => void>();
  const isOwner = () => owner !== null && owner === getMemberSessionKey() && getAuthState().status === 'authenticated';

  function update(patch: Partial<Snapshot>) {
    if ((Object.keys(patch) as (keyof Snapshot)[]).every((key) => snapshot[key] === patch[key])) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }

  async function load(refresh: boolean, background = false) {
    if (!isOwner() || (pending && !refresh) || (!refresh && !snapshot.next)) return;
    const request = { refresh };
    pending = request;
    const isCurrent = () => pending === request && isOwner();
    const position = refresh ? { dayIndex: 0, cursor: null } : snapshot.next!;
    update({ loading: !snapshot.hasLoaded || !refresh, refreshing: refresh && snapshot.hasLoaded && !background, error: null });
    try {
      const calendar = refresh ? await readCalendar() : snapshot.calendar!;
      if (!isCurrent()) return;
      // Revalidate the complete loaded prefix so a tab re-entry never collapses
      // a multi-page list to its first page or retains an obsolete cursor.
      const limit = refresh ? Math.max(ARCHIVE_PAGE_SIZE, snapshot.notes.length) : ARCHIVE_PAGE_SIZE;
      const result = await loadArchivePage(selection, archiveDates(selection, calendar.days), position, isCurrent, limit);
      if (!result || !isCurrent()) return;
      const byId = new Map((refresh ? [] : snapshot.notes).map((note) => [note.id, note]));
      result.notes.forEach((note) => byId.set(note.id, note));
      stale = false;
      const next = snapshot.next?.dayIndex === result.next?.dayIndex && snapshot.next?.cursor === result.next?.cursor ? snapshot.next : result.next;
      update({
        calendar: sameCalendar(snapshot.calendar, calendar) ? snapshot.calendar : calendar,
        notes: reconcileNotes(snapshot.notes, [...byId.values()]), next,
        hasLoaded: true, loading: false, refreshing: false, error: null,
      });
    } catch (error) {
      if (isCurrent()) {
        stale = false; // Retry explicitly, or invalidate on the next screen visit.
        retryRefresh = refresh;
        update({ loading: false, refreshing: false, error: error instanceof Error ? error.message : '보관함을 불러오지 못했어요.' });
      }
    } finally {
      if (pending === request) pending = null;
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh: () => load(true),
    ensureLoaded: () => stale && !pending ? load(true, true) : Promise.resolve(),
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
        if (!sameCalendar(calendars.get(month) ?? null, calendar)) {
          calendars.set(month, calendar);
          listeners.forEach((listener) => listener());
        }
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

let activeCache: { owner: number | null; cache: ReturnType<typeof createArchiveCache> } | null = null;

// Keep the visible values across screen visits and date changes. The screen
// invalidates on focus and silently revalidates this login's cached pages.
export function getArchiveCache(owner: number | null) {
  if (!activeCache || activeCache.owner !== owner) {
    activeCache?.cache.invalidate();
    activeCache = { owner, cache: createArchiveCache(owner) };
  }
  return activeCache.cache;
}
