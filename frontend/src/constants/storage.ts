import type { StorageFilter, StorageNote } from '@/types/storage';

export const StorageColors = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  ink: '#101010',
  blue: '#2350FF',
  lime: '#D6F65A',
  muted: '#939399',
  outsideMonth: '#CBCBD0',
  filterTrack: '#ECECEC',
  sunday: '#DC493C',
} as const;

// 필터 라벨, 판별 기준, 빈 상태 문구를 한곳에서 변경할 수 있습니다.
export const STORAGE_FILTERS: readonly {
  id: StorageFilter;
  label: string;
  matches: (note: StorageNote) => boolean;
  emptyTitle: string;
  emptyDescription: string;
}[] = [
  {
    id: 'all', label: '전체', matches: () => true,
    emptyTitle: '아직 모아둔 노트가 없어요',
    emptyDescription: '소중한 순간을 쪽지로 남겨보세요.\n이곳에 차곡차곡 모아둘게요.',
  },
  {
    id: 'saved', label: '저장', matches: (note) => note.isSaved,
    emptyTitle: '아직 저장한 노트가 없어요',
    emptyDescription: '다시 보고 싶은 쪽지를 저장하면\n이곳에서 함께 볼 수 있어요.',
  },
  {
    id: 'mine', label: '내 노트', matches: (note) => note.author === 'me',
    emptyTitle: '아직 남긴 노트가 없어요',
    emptyDescription: '오늘의 첫 쪽지를 남겨보세요.\n나만의 기록이 시작될 거예요.',
  },
  {
    id: 'friends', label: '친구 노트', matches: (note) => note.author === 'friend',
    emptyTitle: '아직 친구의 노트가 없어요',
    emptyDescription: '친구가 남긴 쪽지를 만나면\n이곳에 모아 보여드릴게요.',
  },
];

export const STORAGE_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;

export const STORAGE_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
