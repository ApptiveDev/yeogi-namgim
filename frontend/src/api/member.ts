import { apiRequest } from './client';

export type MemberStats = {
  writtenNoteCount: number;
  friendCount: number;
  savedNoteCount: number | null;
};

export type MyNote = {
  noteId: string;
  content: string;
  latitude: number;
  longitude: number;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  color: string | null;
  placeName: string | null;
  neighborhood: string | null;
  createdAt: string;
  isMine: true;
};

export type MyNotesPage = { notes: MyNote[]; page: number; size: number; hasNext: boolean };

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export async function getMemberStats(accessToken: string) {
  const result = await apiRequest<MemberStats>('/api/v1/users/me/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!isCount(result?.writtenNoteCount) || !isCount(result.friendCount)
    || !(result.savedNoteCount === null || isCount(result.savedNoteCount))) {
    throw new Error('활동 통계를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

export async function getMyNotes(accessToken: string, page = 0): Promise<MyNotesPage> {
  const result = await apiRequest<MyNotesPage>(`/api/v1/users/me/notes?page=${page}&size=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!Array.isArray(result?.notes) || result.page !== page || result.size !== 20 || typeof result.hasNext !== 'boolean'
    || result.notes.some((note) => !note || typeof note.noteId !== 'string' || !note.noteId
      || typeof note.content !== 'string' || note.isMine !== true
      || !Number.isFinite(Date.parse(note.createdAt))
      || !['PUBLIC', 'FRIENDS', 'PRIVATE'].includes(note.visibility))) {
    throw new Error('작성한 쪽지 목록을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}
