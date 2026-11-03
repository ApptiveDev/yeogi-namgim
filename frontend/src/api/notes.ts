import { apiRequest } from './client';
import type {
  MapBounds,
  NoteMarkersResponse,
  NoteCreateRequest,
  NoteCreateResponse,
} from './types';

export async function createNote(request: NoteCreateRequest, token: string): Promise<NoteCreateResponse> {
  const result = await apiRequest<NoteCreateResponse>('/api/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!result?.noteId || !result?.createdAt) {
    throw new Error('저장 결과를 확인하지 못했어요. 지도에서 쪽지를 확인해 주세요.');
  }
  return result;
}

export const MAP_NOTES_PAGE_SIZE = 500;

export async function getNoteMarkers(bounds: MapBounds, token: string, page = 0): Promise<NoteMarkersResponse> {
  const query = new URLSearchParams({
    minLatitude: String(bounds.minLatitude),
    minLongitude: String(bounds.minLongitude),
    maxLatitude: String(bounds.maxLatitude),
    maxLongitude: String(bounds.maxLongitude),
    page: String(page),
    size: String(MAP_NOTES_PAGE_SIZE),
  });

  const data = await apiRequest<NoteMarkersResponse>(
    `/api/v1/notes?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!Array.isArray(data?.notes) || data.page !== page || data.size !== MAP_NOTES_PAGE_SIZE
    || typeof data.hasNext !== 'boolean' || data.notes.length > MAP_NOTES_PAGE_SIZE
    || data.notes.some((note) => !note || typeof note.noteId !== 'string' || !note.noteId
      || !Number.isFinite(note.latitude) || note.latitude < -90 || note.latitude > 90
      || !Number.isFinite(note.longitude) || note.longitude < -180 || note.longitude > 180
      || typeof note.isMine !== 'boolean')) {
    throw new Error('쪽지 목록 응답이 올바르지 않습니다.');
  }

  return {
    notes: data.notes.map(({ noteId, latitude, longitude, isMine }) => ({ noteId, latitude, longitude, isMine })),
    page: data.page,
    size: data.size,
    hasNext: data.hasNext,
  };
}
