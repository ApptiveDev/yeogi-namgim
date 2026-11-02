import type { MyPageModel, MyPageResponse } from '@/types/my';

// API 구현 후 응답을 이 입력 모델로 변환해 전달합니다.
// 아직 요청하지 않으며, 개발자 설정에 따라 null인 응답/필드를 목업 또는 빈 값으로 대체합니다.
export const MY_PAGE_RESPONSE: MyPageResponse | null = null;

export const MY_PAGE_EMPTY: MyPageModel = {
  displayName: 'EMPTY',
  avatarUrl: null,
  tag: null,
  bio: '',
  loginType: 'EMPTY',
  noteCounts: { found: 0, written: 0, saved: 0 },
};
