// MY API 명세 확정 전 사용하는 화면 입력 모델입니다.
export type MyPageResponse = {
  displayName?: string | null;
  avatarUrl?: string | null;
  tag?: string | null;
  bio?: string | null;
  loginType?: string | null;
  noteCounts?: {
    found?: number | null;
    written?: number | null;
    saved?: number | null;
  } | null;
};

export type MyPageModel = {
  displayName: string;
  avatarUrl: string | null;
  tag: string | null;
  bio: string;
  loginType: string;
  noteCounts: { found: number; written: number; saved: number };
};

export type MyNoteKind = keyof MyPageModel['noteCounts'];
