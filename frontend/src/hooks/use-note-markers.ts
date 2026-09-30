import { useEffect, useState } from 'react';
import { getNoteMarkers } from '@/api/notes';
import type { MapBounds, NoteMarker } from '@/api/types';
import { readSavedGuestToken } from '@/auth/guest-token';

export function useNoteMarkers(bounds: MapBounds | null) {
  const [notes, setNotes] = useState<NoteMarker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bounds) return;

    const currentBounds = bounds;
    let active = true;

    async function loadNotes() {
      try {
        const token = await readSavedGuestToken();

        if (!active) return;

        if (!token) {
          throw new Error('저장된 인증 토큰이 없습니다.');
        }

        const result = await getNoteMarkers(currentBounds, token);

        if (active) {
          setNotes(result);
          setError(null);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : '쪽지 조회 실패');
        }
      }
    }

    loadNotes();

    return () => {
      active = false;
    };
  }, [bounds]);

  return { notes, error };
}