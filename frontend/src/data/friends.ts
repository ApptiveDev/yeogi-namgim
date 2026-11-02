import type { FriendsData } from '@/types/friends';

import { createFriendsMock } from './friends.mock';

// 친구 API 연결 후 화면 모델로 변환한 응답을 전달합니다. 실제 빈 응답도 유지합니다.
export const FRIENDS_RESPONSE: FriendsData | null = null;
const EMPTY_FRIENDS: FriendsData = { friends: [], activities: [] };

export function resolveFriendsData(response: FriendsData | null | undefined, useMockData: boolean, now: number): FriendsData {
  return response ?? (useMockData ? createFriendsMock(now) : EMPTY_FRIENDS);
}
