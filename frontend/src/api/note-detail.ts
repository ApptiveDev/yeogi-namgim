import { apiRequest } from './client';
import type { BookmarkStateResponse, NoteLocationInput, NoteOpenResponse } from './types';

const nullableString = (value: unknown) => value === null || typeof value === 'string';

export async function openNote(noteId: string, location: NoteLocationInput | null, token: string): Promise<NoteOpenResponse> {
  const result = await apiRequest<NoteOpenResponse>(`/api/v1/notes/${encodeURIComponent(noteId)}/open`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(location ?? {}),
  });
  if (result?.noteId !== noteId || typeof result.content !== 'string' || typeof result.isMine !== 'boolean'
    || typeof result.createdAt !== 'string' || !Number.isFinite(Date.parse(result.createdAt))
    || !['PUBLIC', 'FRIENDS', 'PRIVATE'].includes(result.visibility)
    || !nullableString(result.color) || !nullableString(result.placeName) || !nullableString(result.neighborhood)
    || typeof result.isSaved !== 'boolean' || typeof result.isRead !== 'boolean') {
    throw new Error('쪽지 응답을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

export async function changeBookmark(noteId: string, save: boolean, location: NoteLocationInput | null, token: string): Promise<BookmarkStateResponse> {
  const result = await apiRequest<BookmarkStateResponse>(`/api/v1/notes/${encodeURIComponent(noteId)}/bookmarks`, {
    method: save ? 'POST' : 'DELETE',
    headers: { Authorization: `Bearer ${token}`, ...(save && { 'Content-Type': 'application/json' }) },
    ...(save && { body: JSON.stringify(location ?? {}) }),
  });
  if (result?.noteId !== noteId || result.isSaved !== save
    || (save ? typeof result.savedAt !== 'string' || !Number.isFinite(Date.parse(result.savedAt)) : result.savedAt !== null)) {
    throw new Error('저장 상태를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}
