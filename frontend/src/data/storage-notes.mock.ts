import type { StorageNote } from '@/types/storage';

// 화면 확인용 데이터입니다. 서버나 기기 저장소에 저장하지 않습니다.
export const STORAGE_NOTE_MOCKS: readonly StorageNote[] = [
  {
    id: 'mock-storage-saved-20261101',
    title: '저장테스트01',
    createdAt: '2026-11-01T10:00:00+09:00',
    author: 'anonymous',
    locationLabel: '서울 성동구',
    isSaved: true,
    thumbnailColor: '#A12E33',
  },
  {
    id: 'mock-storage-mine-20261101',
    title: 'MY테스트01',
    createdAt: '2026-11-01T12:00:00+09:00',
    author: 'me',
    locationLabel: '서울숲 주변',
    isSaved: false,
    thumbnailColor: '#849771',
  },
  {
    id: 'mock-storage-friend-20261101',
    title: '친구테스트01',
    createdAt: '2026-11-01T14:00:00+09:00',
    author: 'friend',
    locationLabel: '뚝섬 한강공원',
    isSaved: false,
    thumbnailColor: '#9BACED',
  }, 
  {
    id: 'mock-storage-friend-20261118',
    title: '친구테스트02',
    createdAt: '2026-11-18T14:00:00+09:00',
    author: 'friend',
    locationLabel: '성수동',
    isSaved: false,
    thumbnailColor: '#1f1410',
  },
  {
    id: 'mock-storage-friend-20261110',
    title: '저장테스트02',
    createdAt: '2026-11-10T14:00:00+09:00',
    author: 'anonymous',
    locationLabel: '서울숲',
    isSaved: true,
    thumbnailColor: '#e2c43f',
  },
];
