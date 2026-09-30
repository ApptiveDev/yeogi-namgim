import { apiRequest } from './client';
import type {
  MapBounds,
  NoteMarker,
  NoteMarkersResponse,
} from './types';

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