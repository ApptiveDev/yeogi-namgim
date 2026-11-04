import { openNote } from '../api/note-detail';
import type { NoteLocationInput } from '../api/types';
import { runMemberRequest } from '../auth/member-session';

export async function loadNoteDetail(noteId: string, skipLocation: boolean, locate: () => Promise<NoteLocationInput>, isCurrent: () => boolean) {
  if (!isCurrent()) return null;
  const location = skipLocation ? null : await locate();
  if (!isCurrent()) return null;
  const note = await runMemberRequest((token) => openNote(noteId, location, token));
  return isCurrent() ? note : null;
}
