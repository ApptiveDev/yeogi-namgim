type BookmarkChange = { owner: number; noteId: string; isSaved: boolean };
const listeners = new Set<(change: BookmarkChange) => void>();

export function subscribeBookmarkChanges(listener: (change: BookmarkChange) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publishBookmarkChange(change: BookmarkChange) {
  listeners.forEach((listener) => listener(change));
}
