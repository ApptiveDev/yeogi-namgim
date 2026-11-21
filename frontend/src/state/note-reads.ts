type NoteRead = { owner: number; noteId: string };
const listeners = new Set<(event: NoteRead) => void>();

export function subscribeNoteReads(listener: (event: NoteRead) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publishNoteRead(event: NoteRead) {
  listeners.forEach((listener) => listener(event));
}
