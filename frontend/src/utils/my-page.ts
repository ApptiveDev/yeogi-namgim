import { MY_PAGE_EMPTY } from '../data/my-page';
import { MY_PAGE_MOCK } from '../data/my-page.mock';
import type { MyPageModel, MyPageResponse } from '../types/my';

function normalizeCount(count: number) {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
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

export function formatMyNoteCount(count: number, maximum: number) {
  const value = normalizeCount(count);
  return value > maximum ? `${maximum}+` : String(value);
}
