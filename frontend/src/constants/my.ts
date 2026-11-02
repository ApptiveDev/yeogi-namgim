import type { MyNoteKind } from '@/types/my';
import type { StorageFilter } from '@/types/storage';

export const MyColors = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  ink: '#0E0E0E',
  blue: '#2350FF',
  lime: '#D6F65A',
  muted: '#8E8E93',
} as const;

export const MyFonts = {
  display: 'ArchivoBlack',
  regular: 'NotoSansKR-Regular',
  medium: 'NotoSansKR-Medium',
  bold: 'NotoSansKR-Bold',
} as const;

export const MY_NOTE_STATS: readonly { id: MyNoteKind; label: string; maximum: number; filter: StorageFilter }[] = [
  { id: 'found', label: '찾은 노트', maximum: 999, filter: 'all' },
  { id: 'written', label: '작성한 노트', maximum: 99, filter: 'mine' },
  { id: 'saved', label: '저장한 노트', maximum: 99, filter: 'saved' },
];
