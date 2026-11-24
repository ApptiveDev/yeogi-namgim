import { openNote } from '../api/note-detail';
import type { NoteLocationInput } from '../api/types';
import { getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { publishNoteRead } from '../state/note-reads';

export async function loadNoteDetail(noteId: string, location: NoteLocationInput | null, isCurrent: () => boolean) {
  if (!isCurrent()) return null;
  const owner = getMemberSessionKey();
  const note = await runMemberRequest((token) => openNote(noteId, location, token));
  if (note.isRead && owner === getMemberSessionKey()) publishNoteRead({ owner, noteId: note.noteId });
  return isCurrent() ? note : null;
}
