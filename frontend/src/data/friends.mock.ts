import type { FriendsData } from '@/types/friends';

const FRIENDS = [
  { id: 'mock-friend-1', displayName: '준우', avatarUrl: null, hasNewActivity: true,
    sticker: { source: require('../../assets/images/my/eight-ball.png'), backgroundColor: '#aaa8a4' } },
  { id: 'mock-friend-2', displayName: '범준', avatarUrl: null, hasNewActivity: true,
    sticker: { source: require('../../assets/images/my/clover.png'), backgroundColor: '#D6F65A' } },
  { id: 'mock-friend-3', displayName: '채민', avatarUrl: null,
    sticker: { source: require('../../assets/images/my/smiley.png'), backgroundColor: '#FFFFFF' } },
  { id: 'mock-friend-4', displayName: '민서', avatarUrl: null,
    sticker: { source: require('../../assets/images/my/cherry.png'), backgroundColor: '#F6B9A8' } },
  { id: 'mock-friend-5', displayName: '다빈', avatarUrl: null,
    sticker: { source: require('../../assets/images/my/sparkle.png'), backgroundColor: '#2350FF' } },
  { id: 'mock-friend-6', displayName: '지홍', avatarUrl: null,
    sticker: { source: require('../../assets/images/my/cat.png'), backgroundColor: '#BFD6FF'}
  },
] as const;

// 화면 확인용 상대 시간입니다. 서버나 기기 저장소에 저장하지 않습니다.
export function createFriendsMock(now: number): FriendsData {
  const hoursAgo = (hours: number) => now - hours * 60 * 60_000;
  return {
    friends: FRIENDS,
    // 최신순으로 정의해 친구를 선택했을 때도 같은 순서로 보여줍니다.
    activities: [
      { id: 'mock-friend-note-1', friend: FRIENDS[0], locationLabel: '성수동', createdAtMs: hoursAgo(1) },
      { id: 'mock-friend-note-2', friend: FRIENDS[1], locationLabel: '서울숲', createdAtMs: hoursAgo(25) },
      { id: 'mock-friend-note-3', friend: FRIENDS[2], locationLabel: '뚝섬 한강공원', createdAtMs: hoursAgo(49) },
      { id: 'mock-friend-note-4', friend: FRIENDS[3], locationLabel: '연남동', createdAtMs: hoursAgo(73) },
      { id: 'mock-friend-note-5', friend: FRIENDS[0], locationLabel: '성수역 근처', createdAtMs: hoursAgo(97) },
      { id: 'mock-friend-note-6', friend: FRIENDS[4], locationLabel: '북촌 한옥마을', createdAtMs: hoursAgo(121) },
    ],
  };
}
