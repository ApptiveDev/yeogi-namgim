import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';

import type { MemberProfile } from '@/api/auth';
import type { MemberStats } from '@/api/member';
import { getAuthState, getMemberSessionKey, subscribeAuth } from '@/auth/member-session';
import { loadMemberProfile, loadMemberStats } from '@/state/member-account';

type Owner = number | null;
type LoadState<T> = { owner: Owner; data: T | null; loading: boolean; error: string | null };
type Options = { includeStats?: boolean; keepPreviousData?: boolean };

function getAuthenticatedOwner() {
  return getAuthState().status === 'authenticated' ? getMemberSessionKey() : null;
}

function loadingState<T>(owner: Owner, loading = true): LoadState<T> {
  return { owner, data: null, loading, error: null };
}

export function useMemberAccount({ includeStats = false, keepPreviousData = false }: Options = {}) {
  const owner = useSyncExternalStore(subscribeAuth, getAuthenticatedOwner, () => null);
  const requestRef = useRef(0);
  const [profile, setProfile] = useState(() => loadingState<MemberProfile>(owner));
  const [stats, setStats] = useState(() => loadingState<MemberStats>(owner, includeStats));

  const reload = useCallback(() => {
    if (owner === null || owner !== getAuthenticatedOwner()) return;
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId && owner === getAuthenticatedOwner();

    function load<T>(request: () => Promise<T>, update: Dispatch<SetStateAction<LoadState<T>>>) {
      const previousData = (state: LoadState<T>) => keepPreviousData && state.owner === owner ? state.data : null;
      update((state) => {
        const data = previousData(state);
        return state.owner === owner && state.data === data && state.loading && state.error === null
          ? state
          : { owner, data, loading: true, error: null };
      });
      void request().then(
        (data) => { if (isCurrent()) update({ owner, data, loading: false, error: null }); },
        (error: unknown) => {
          if (!isCurrent()) return;
          update((state) => ({
            owner,
            data: previousData(state),
            loading: false,
            error: error instanceof Error ? error.message : '정보를 불러오지 못했어요.',
          }));
        },
      );
    }
    load(loadMemberProfile, setProfile);
    if (includeStats) load(loadMemberStats, setStats);
  }, [owner, includeStats, keepPreviousData]);

  useFocusEffect(useCallback(() => {
    reload();
    return () => { requestRef.current += 1; };
  }, [reload]));

  return {
    profile: profile.owner === owner ? profile : loadingState<MemberProfile>(owner),
    stats: stats.owner === owner ? stats : loadingState<MemberStats>(owner, includeStats),
    reload,
  };
}
