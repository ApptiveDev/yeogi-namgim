import { MY_PAGE_EMPTY } from '../data/my-page';
import { MY_PAGE_MOCK } from '../data/my-page.mock';
import type { MyPageModel, MyPageResponse } from '../types/my';
import type { MemberProfile } from '../api/auth';
import type { MemberStats } from '../api/member';

function normalizeCount(count: number | null) {
  if (count === null) return null;
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function memberToMyPage(profile: MemberProfile, stats: MemberStats | null = null): MyPageModel {
  return {
    displayName: profile.nickname,
    avatarUrl: null,
    tag: null,
    bio: '',
    loginType: '',
    noteCounts: { found: null, written: stats?.writtenNoteCount ?? null, saved: stats?.savedNoteCount ?? null },
  };
}

export function resolveMyPageData(response: MyPageResponse | null | undefined, useMockData = true): MyPageModel {
  const fallback = useMockData ? MY_PAGE_MOCK : MY_PAGE_EMPTY;
  return {
    displayName: response?.displayName?.trim() || fallback.displayName,
    avatarUrl: response?.avatarUrl?.trim() || fallback.avatarUrl,
    tag: response?.tag?.trim() || fallback.tag,
    bio: (response?.bio ?? fallback.bio).trim(),
    loginType: response?.loginType?.trim() || fallback.loginType,
    noteCounts: {
      found: normalizeCount(response?.noteCounts?.found ?? fallback.noteCounts.found),
      written: normalizeCount(response?.noteCounts?.written ?? fallback.noteCounts.written),
      saved: normalizeCount(response?.noteCounts?.saved ?? fallback.noteCounts.saved),
    },
  };
}

export function formatMyNoteCount(count: number | null, maximum: number) {
  const value = normalizeCount(count);
  if (value === null) return '—';
  return value > maximum ? `${maximum}+` : String(value);
}
