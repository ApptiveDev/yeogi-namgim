// 보관함 API 응답을 카드에서 사용하는 화면 모델로 변환합니다.
export type StorageNote = {
  id: string;
  title: string;
  createdAt: string;
  author: 'me' | 'friend' | 'anonymous';
  authorDisplayName: string;
  locationLabel: string;
  isSaved: boolean;
  thumbnailColor: string;
  openable: boolean;
};

export type StorageFilter = 'all' | 'saved' | 'mine' | 'friends';
export type StorageFilterCounts = Record<StorageFilter, number>;
