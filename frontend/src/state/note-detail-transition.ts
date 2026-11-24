const listeners = new Set<() => void>();

export function subscribeNoteDetailOpened(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publishNoteDetailOpened() {
  listeners.forEach((listener) => listener());
}
