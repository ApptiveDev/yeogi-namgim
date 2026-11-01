// 보관함 전용 화면 모델. API 명세 확정 후 응답을 이 형태로 변환합니다.
export type StorageNote = {
  id: string;
  title: string;
  createdAt: string;
  author: 'me' | 'friend' | 'anonymous';
  locationLabel: string;
  isSaved: boolean;
  thumbnailColor: string;
};

export type StorageFilter = 'all' | 'saved' | 'mine' | 'friends';
export type StorageFilterCounts = Record<StorageFilter, number>;
