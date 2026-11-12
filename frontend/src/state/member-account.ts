import { getMemberProfile, updateMemberProfile, type MemberProfile } from '../api/auth';
import { ApiError } from '../api/client';
import { getMemberStats, type MemberStats } from '../api/member';
import { runMemberRequest } from '../auth/member-session';
import { createMemberCache, getMemberOwner } from './member-cache';

type LoadState<T> = { owner: number | null; data: T | null; loading: boolean; error: string | null };

function createAccountResource<T>(owner: number | null, fetch: (token: string) => Promise<T>, equal: (a: T, b: T) => boolean) {
  let snapshot: LoadState<T> = { owner, data: null, loading: true, error: null };
  let pending: Promise<T> | null = null;
  const listeners = new Set<() => void>();

  function update(data: T | null, loading: boolean, error: string | null) {
    if (snapshot.data === data && snapshot.loading === loading && snapshot.error === error) return;
    snapshot = { owner, data, loading, error };
    listeners.forEach((listener) => listener());
  }

  function commit(data: T) {
    update(snapshot.data !== null && equal(snapshot.data, data) ? snapshot.data : data, false, null);
  }

  function load(background = false) {
    if (owner === null || owner !== getMemberOwner()) return Promise.reject(new Error('로그인 정보를 확인해 주세요.'));
    if (pending) {
      if (!background) update(snapshot.data, true, null);
      return pending;
    }

    const isCurrent = () => pending === request && owner === getMemberOwner();
    const request = runMemberRequest(fetch).then((data) => {
      if (isCurrent()) commit(data);
      return data;
    }, (error: unknown) => {
      if (isCurrent()) {
        const forbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);
        update(forbidden ? null : snapshot.data, false, error instanceof Error ? error.message : '정보를 불러오지 못했어요.');
      }
      throw error;
    }).finally(() => {
      if (pending === request) pending = null;
    });
    pending = request;
    if (!background || snapshot.data === null) update(snapshot.data, true, null);
    return request;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    replace(data: T) { pending = null; commit(data); },
  };
}

function sameProfile(a: MemberProfile, b: MemberProfile) {
  return a.userId === b.userId && a.nickname === b.nickname && a.email === b.email && a.createdAt === b.createdAt;
}

function sameStats(a: MemberStats, b: MemberStats) {
  return a.writtenNoteCount === b.writtenNoteCount && a.savedNoteCount === b.savedNoteCount && a.friendCount === b.friendCount;
}

export const getMemberAccount = createMemberCache((owner) => ({
  profile: createAccountResource(owner, getMemberProfile, sameProfile),
  stats: createAccountResource(owner, getMemberStats, sameStats),
}));

export async function saveMemberNickname(nickname: string) {
  const account = getMemberAccount();
  const profile = await runMemberRequest((token) => updateMemberProfile(nickname, token));
  // Publish the save response and prevent any pre-save read from replacing it.
  if (account === getMemberAccount()) account.profile.replace(profile);
}
