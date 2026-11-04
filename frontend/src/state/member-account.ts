import { getMemberProfile, updateMemberProfile } from '../api/auth';
import { getMemberStats } from '../api/member';
import { getMemberSessionKey, runMemberRequest } from '../auth/member-session';

function sharePendingRequest<T>(request: (token: string) => Promise<T>) {
  let pending: { owner: number; promise: Promise<T> } | null = null;

  function load() {
    const owner = getMemberSessionKey();
    if (pending?.owner === owner) return pending.promise;

    const promise = runMemberRequest(request).finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    pending = { owner, promise };
    return promise;
  }

  function invalidate(owner: number) {
    if (pending?.owner === owner) pending = null;
  }

  return { load, invalidate };
}

const profileRequest = sharePendingRequest(getMemberProfile);
export const loadMemberProfile = profileRequest.load;
export const loadMemberStats = sharePendingRequest(getMemberStats).load;

export async function saveMemberNickname(nickname: string) {
  const owner = getMemberSessionKey();
  await runMemberRequest((token) => updateMemberProfile(nickname, token));
  // 편집 화면을 닫고 돌아갈 때는 저장 전에 시작된 프로필 요청을 공유하지 않습니다.
  profileRequest.invalidate(owner);
}
