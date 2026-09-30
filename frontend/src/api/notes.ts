import { apiRequest } from './client';
import type {
  MapBounds,
  NoteMarker,
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

export async function getNoteMarkers(bounds: MapBounds, token: string): Promise<NoteMarker[]> {
  const query = new URLSearchParams({
    minLatitude: String(bounds.minLatitude),
    minLongitude: String(bounds.minLongitude),
    maxLatitude: String(bounds.maxLatitude),
    maxLongitude: String(bounds.maxLongitude),
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

  if (!Array.isArray(data?.notes)) {
    throw new Error('쪽지 목록 응답이 올바르지 않습니다.');
  }

  return data.notes;
}
