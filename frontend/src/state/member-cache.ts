import { getAuthState, getMemberSessionKey, subscribeAuth } from '../auth/member-session';

export function getMemberOwner() {
  return getAuthState().status === 'authenticated' ? getMemberSessionKey() : null;
}

export function createMemberCache<T>(create: (owner: number | null) => T) {
  let owner = getMemberOwner();
  let cache = create(owner);

  function getCache() {
    const current = getMemberOwner();
    if (owner !== current) {
      owner = current;
      cache = create(owner);
    }
    return cache;
  }

  subscribeAuth(getCache);
  return getCache;
}
