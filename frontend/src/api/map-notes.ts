import { getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { MAP_NOTES_LIMIT } from '../constants/home-map';
import { splitMapBounds } from '../utils/map-bounds';
import { getNoteMarkers, MAP_NOTES_PAGE_SIZE } from './notes';
import type { MapBounds, MapNoteLocation, MapNotePreview, NoteMarker } from './types';

const MAX_MAP_PAGES = Math.ceil(MAP_NOTES_LIMIT / MAP_NOTES_PAGE_SIZE);
const LIMIT_MESSAGE = '표시할 쪽지가 너무 많아요. 지도를 확대하고 다시 시도해 주세요.';

async function loadMapPages(bounds: MapBounds, isCurrent: () => boolean, location?: MapNoteLocation) {
  const owner = getMemberSessionKey();
  const active = () => isCurrent() && owner === getMemberSessionKey();
  const notes = new Map<string, NoteMarker>();
  const previews = new Map<string, MapNotePreview>();
  for (const range of splitMapBounds(bounds)) {
    for (let page = 0; page < MAX_MAP_PAGES; page += 1) {
      if (!active()) return null;
      const result = await runMemberRequest((token) => getNoteMarkers(range, token, page, location));
      if (!active()) return null;
      for (const note of result.notes) {
        if (!notes.has(note.noteId) && notes.size >= MAP_NOTES_LIMIT) throw new Error(LIMIT_MESSAGE);
        notes.set(note.noteId, note);
        previews.delete(note.noteId);
      }
      for (const note of result.openableNotes ?? []) previews.set(note.noteId, note);
      if (!result.hasNext) break;
      if (page === MAX_MAP_PAGES - 1) throw new Error(LIMIT_MESSAGE);
    }
  }
  return active() ? { notes: [...notes.values()], openableNotes: [...previews.values()] } : null;
}

export async function loadMapNotes(bounds: MapBounds, isCurrent: () => boolean): Promise<NoteMarker[] | null> {
  return (await loadMapPages(bounds, isCurrent))?.notes ?? null;
}

export async function loadMapNotePreviews(bounds: MapBounds, location: MapNoteLocation, isCurrent: () => boolean): Promise<MapNotePreview[] | null> {
  return (await loadMapPages(bounds, isCurrent, location))?.openableNotes ?? null;
}
