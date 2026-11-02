// 화면 입력 모델. 실제 회원 API 응답은 memberToMyPage에서 변환합니다.
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
  noteCounts: { found: number | null; written: number | null; saved: number | null };
};

export type MyNoteKind = keyof MyPageModel['noteCounts'];
