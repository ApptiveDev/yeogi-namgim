import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { getMyNotes, type MyNote } from '@/api/member';
import { getAuthState, getInitialAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';

type NotesState = { owner: number; notes: MyNote[]; page: number; hasNext: boolean; loading: boolean; error: string | null };

export function useMyNotes() {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const generation = useRef(0);
  const busy = useRef<number | null>(null);
  const [state, setState] = useState<NotesState>({ owner, notes: [], page: -1, hasNext: false, loading: true, error: null });

  const load = useCallback(async (page: number, replace: boolean, current: number) => {
    if (busy.current === current) return;
    busy.current = current;
    setState((previous) => ({ ...previous, ...(replace ? { owner, notes: [], page: -1, hasNext: false } : {}), loading: true, error: null }));
    try {
      const result = await runMemberRequest((token) => getMyNotes(token, page));
      if (generation.current !== current || owner !== getMemberSessionKey()) return;
      setState((previous) => ({
        owner,
        notes: [...new Map((replace ? result.notes : [...previous.notes, ...result.notes]).map((note) => [note.noteId, note])).values()],
        page: result.page, hasNext: result.hasNext, loading: false, error: null,
      }));
    } catch (error) {
      if (generation.current === current && owner === getMemberSessionKey()) {
        setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '쪽지 목록을 불러오지 못했어요.' }));
      }
    } finally {
      if (busy.current === current) busy.current = null;
    }
  }, [owner]);

  useFocusEffect(useCallback(() => {
    if (auth.status !== 'authenticated') return;
    const current = ++generation.current;
    void load(0, true, current);
    return () => { generation.current += 1; };
  }, [auth.status, load]));

  const refresh = () => { void load(0, true, ++generation.current); };
  const loadMore = () => {
    if (state.owner === owner && !state.loading && state.hasNext && state.page < 10000) {
      void load(state.page + 1, false, generation.current);
    }
  };
  return {
    ...(state.owner === owner ? state : { owner, notes: [], page: -1, hasNext: false, loading: true, error: null }),
    refresh, loadMore,
    retry: state.page < 0 ? refresh : loadMore,
  };
}
