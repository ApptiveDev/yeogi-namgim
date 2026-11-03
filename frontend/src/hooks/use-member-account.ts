import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';

import { getMemberProfile, type MemberProfile } from '@/api/auth';
import { getMemberStats, type MemberStats } from '@/api/member';
import { getAuthState, getInitialAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';

type LoadState<T> = { owner: number; data: T | null; loading: boolean; error: string | null };
type Options = { includeStats?: boolean; keepPreviousData?: boolean };

export function useMemberAccount({ includeStats = false, keepPreviousData = false }: Options = {}) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const requestRef = useRef(0);
  const [profile, setProfile] = useState<LoadState<MemberProfile>>({ owner, data: null, loading: true, error: null });
  const [stats, setStats] = useState<LoadState<MemberStats>>({ owner, data: null, loading: includeStats, error: null });

  const reload = useCallback(() => {
    if (auth.status !== 'authenticated') return;
    const requestId = ++requestRef.current;
    function load<T>(request: (token: string) => Promise<T>, update: Dispatch<SetStateAction<LoadState<T>>>) {
      const previousData = (state: LoadState<T>) => keepPreviousData && state.owner === owner ? state.data : null;
      update((state) => ({ owner, data: previousData(state), loading: true, error: null }));
      void runMemberRequest(request).then(
        (data) => { if (requestRef.current === requestId) update({ owner, data, loading: false, error: null }); },
        (error: unknown) => {
          if (requestRef.current === requestId) {
            update((state) => ({ owner, data: previousData(state), loading: false, error: error instanceof Error ? error.message : '정보를 불러오지 못했어요.' }));
          }
        },
      );
    }
    load(getMemberProfile, setProfile);
    if (includeStats) load(getMemberStats, setStats);
  }, [auth.status, owner, includeStats, keepPreviousData]);

  useFocusEffect(useCallback(() => {
    reload();
    return () => { requestRef.current += 1; };
  }, [reload]));

  return {
    profile: profile.owner === owner ? profile : { owner, data: null, loading: true, error: null },
    stats: stats.owner === owner ? stats : { owner, data: null, loading: includeStats, error: null },
    reload,
  };
}
