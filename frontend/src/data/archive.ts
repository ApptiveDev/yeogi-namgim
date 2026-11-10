import { getArchiveNotes, type ArchiveDay, type ArchiveNote, type ArchiveType } from '../api/archive';
import { runMemberRequest } from '../auth/member-session';
import type { StorageFilter, StorageNote } from '../types/storage';

export type ArchiveSelection = { month: string; date: string | null; type: ArchiveType };
export type ArchivePosition = { dayIndex: number; cursor: string | null };
export const ARCHIVE_PAGE_SIZE = 20;

export function filterArchiveNotes(notes: readonly StorageNote[], filter: StorageFilter) {
  return filter === 'saved' ? notes.filter((note) => note.isSaved)
    : filter === 'mine' ? notes.filter((note) => note.author === 'me') : notes;
}

export function archiveDayCount(day: ArchiveDay, type: ArchiveType) {
  return type === 'WRITTEN' ? day.writtenCount : type === 'SAVED' ? day.savedCount : day.writtenCount + day.savedCount;
}

export function archiveDates(selection: ArchiveSelection, days: readonly ArchiveDay[]) {
  // A selected day is always queried, even if the calendar has just become stale.
  return selection.date ? [selection.date] : days.filter((day) => archiveDayCount(day, selection.type) > 0)
    .map((day) => day.date).sort().reverse();
}

export function toStorageNote(note: ArchiveNote): StorageNote {
  const openable = note.accessStatus === 'OPENABLE';
  return {
    id: note.noteId,
    title: openable ? note.preview ?? '내용 없음' : '내용을 볼 수 없는 쪽지',
    createdAt: note.createdAt,
    author: note.authorCategory === 'MINE' ? 'me' : note.authorCategory === 'FRIEND' ? 'friend' : 'anonymous',
    authorDisplayName: note.authorDisplayName,
    locationLabel: openable ? note.placeName || note.neighborhood || '장소 정보 없음' : '장소 정보 없음',
    isSaved: note.isSaved,
    thumbnailColor: note.color && /^#[0-9a-f]{6}$/i.test(note.color) ? note.color : '#EEE6D3',
    openable,
  };
}

export async function loadArchivePage(selection: ArchiveSelection, dates: readonly string[], position: ArchivePosition, isCurrent: () => boolean) {
  const notes: ArchiveNote[] = [];
  let { dayIndex, cursor } = position;
  // The API has daily cursors. Fill one screen page by continuing through the
  // calendar's days, without downloading the whole month or estimating counts.
  while (dayIndex < dates.length && notes.length < ARCHIVE_PAGE_SIZE) {
    if (!isCurrent()) return null;
    const page = await runMemberRequest((token) => getArchiveNotes(token, dates[dayIndex], selection.type, cursor, ARCHIVE_PAGE_SIZE - notes.length));
    if (!isCurrent()) return null;
    notes.push(...page.notes);
    if (page.hasNext) {
      cursor = page.nextCursor;
      // A concurrently hidden card can produce an empty page. Leave further
      // cursor traversal to the next explicit request instead of looping forever.
      if (page.notes.length === 0) break;
    } else {
      dayIndex++;
      cursor = null;
    }
  }
  return { notes: notes.map(toStorageNote), next: dayIndex < dates.length ? { dayIndex, cursor } : null };
}
