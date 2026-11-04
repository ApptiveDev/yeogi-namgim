import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { getMyNotes, type MyNote } from '@/api/member';
import { getAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';

type NotesState = {
  owner: number | null;
  notes: readonly MyNote[];
  page: number;
  hasNext: boolean;
  loading: boolean;
  error: string | null;
};

const EMPTY_NOTES: readonly MyNote[] = [];

function initialNotesState(owner: number | null): NotesState {
  return { owner, notes: EMPTY_NOTES, page: -1, hasNext: false, loading: true, error: null };
}

function getNotesOwner() {
  return getAuthState().status === 'authenticated' ? getMemberSessionKey() : null;
}

function mergeNotes(previous: readonly MyNote[], incoming: readonly MyNote[]) {
  const byId = new Map<string, MyNote>();
  for (const note of previous) byId.set(note.noteId, note);
  for (const note of incoming) byId.set(note.noteId, note);
  return [...byId.values()];
}

export function useMyNotes() {
  const owner = useSyncExternalStore(subscribeAuth, getNotesOwner, () => null);
  const activeRequest = useRef<{ owner: number; page: number } | null>(null);
  const [state, setState] = useState(() => initialNotesState(owner));

  const load = useCallback(async (page: number) => {
    if (owner === null || owner !== getNotesOwner()) return;

    const pending = activeRequest.current;
    // 새로고침은 더 보기보다 우선하고, 이미 요청 중인 첫 페이지는 공유합니다.
    if (pending?.owner === owner && (page !== 0 || pending.page === 0)) return;

    const request = { owner, page };
    activeRequest.current = request;
    setState((previous) => page === 0 || previous.owner !== owner
      ? initialNotesState(owner)
      : { ...previous, loading: true, error: null });

    try {
      const result = await runMemberRequest((token) => getMyNotes(token, page));
      if (activeRequest.current !== request || owner !== getNotesOwner()) return;

      setState((previous) => ({
        owner,
        notes: mergeNotes(page === 0 || previous.owner !== owner ? EMPTY_NOTES : previous.notes, result.notes),
        page: result.page,
        hasNext: result.hasNext,
        loading: false,
        error: null,
      }));
    } catch (error) {
      if (activeRequest.current === request && owner === getNotesOwner()) {
        setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '쪽지 목록을 불러오지 못했어요.' }));
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = null;
    }
  }, [owner]);

  const refresh = useCallback(() => { void load(0); }, [load]);
  useFocusEffect(useCallback(() => {
    refresh();
    return () => { activeRequest.current = null; };
  }, [refresh]));

  const { notes, page, hasNext, loading, error } = state.owner === owner ? state : initialNotesState(owner);
  const loadMore = useCallback(() => {
    if (!loading && hasNext && page < 10000) void load(page + 1);
  }, [hasNext, load, loading, page]);
  return {
    notes,
    hasNext,
    loading,
    error,
    refreshing: loading && page < 0,
    refresh,
    loadMore,
    retry: page < 0 ? refresh : loadMore,
  };
}
