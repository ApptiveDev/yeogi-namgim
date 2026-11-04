export const MyColors = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  ink: '#0E0E0E',
  blue: '#2350FF',
  lime: '#D6F65A',
  muted: '#8E8E93',
} as const;

export const MY_NOTE_STATS = [
  { id: 'found', label: '찾은 노트', maximum: 999 },
  { id: 'written', label: '작성한 노트', maximum: 999 },
  { id: 'saved', label: '저장한 노트', maximum: 999 },
] as const;
