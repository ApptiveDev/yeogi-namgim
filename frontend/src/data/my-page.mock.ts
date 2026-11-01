import type { MyPageModel } from '@/types/my';

export const MY_PAGE_MOCK: MyPageModel = {
  displayName: 'Test_name',
  avatarUrl: null,
  tag: 'test_tag.note',
  bio: '오늘의 순간을 쪽지로 남겨요',
  loginType: '카카오 로그인',
  noteCounts: { found: 1000, written: 5, saved: 12 },
};
