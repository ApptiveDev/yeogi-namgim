import type { StorageFilterCounts, StorageNote } from '@/types/storage';
import { STORAGE_NOTE_MOCKS } from './storage-notes.mock';

// API 구현 후 화면 모델로 변환한 응답을 전달합니다. 실제 빈 배열은 그대로 유지합니다.
export const STORAGE_NOTES_RESPONSE: readonly StorageNote[] | null = null;
const EMPTY_STORAGE_NOTES: readonly StorageNote[] = [];

export function resolveStorageNotes(response: readonly StorageNote[] | null | undefined, useMockData = true): readonly StorageNote[] {
  return response ?? (useMockData ? STORAGE_NOTE_MOCKS : EMPTY_STORAGE_NOTES);
}

// 필터 배지 확인용 임시 건수. null로 바꾸면 실제 목록에서 계산한 건수를 사용합니다.
export const STORAGE_COUNT_PREVIEW: StorageFilterCounts | null = null;
