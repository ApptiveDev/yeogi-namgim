import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/api/client';
import { loadMapNotes } from '@/api/map-notes';
import type { MapBounds, NoteMarker } from '@/api/types';
import { getAuthState, getInitialAuthState, getMemberSessionKey, subscribeAuth } from '@/auth/member-session';
import { MAP_QUERY_PADDING_RATIO } from '@/constants/home-map';
import { containsMapBounds, expandMapBounds } from '@/utils/map-bounds';

const EMPTY_NOTES: NoteMarker[] = [];

type Request = { bounds: MapBounds; owner: number; refreshKey: number; retryKey: number };
type Cache = Request & { notes: NoteMarker[] };
type Failure = Request & { message: string };

function sameNotes(previous: NoteMarker[], next: NoteMarker[]) {
  return previous.length === next.length && previous.every((note, index) => {
    const other = next[index];
    return note.noteId === other.noteId && note.latitude === other.latitude
      && note.longitude === other.longitude && note.isMine === other.isMine;
  });
}

export function useNoteMarkers(bounds: MapBounds | null, refreshKey = 0) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const [retryKey, setRetryKey] = useState(0);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const mountedRef = useRef(false);
  const requestRef = useRef<Request | null>(null);
  const [result, setResult] = useState<{ cache: Cache | null; failure: Failure | null }>({ cache: null, failure: null });
  const { cache, failure } = result;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestRef.current = null; };
  }, []);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    setRetryKey((value) => value + 1);
    return () => { requestRef.current = null; setFocused(false); };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
      if (next === 'active') setRetryKey((value) => value + 1);
      else requestRef.current = null;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!bounds || auth.status !== 'authenticated' || !focused || !appActive) {
      requestRef.current = null;
      return;
    }
    const matches = (request: Request) => request.owner === owner
      && request.refreshKey === refreshKey && request.retryKey === retryKey;
    const previousRequest = requestRef.current;
    if (cache && matches(cache) && containsMapBounds(cache.bounds, bounds)) {
      // Returning to the loaded area must not allow an obsolete request to replace it.
      if (previousRequest && (!matches(previousRequest) || !containsMapBounds(previousRequest.bounds, bounds))) {
        requestRef.current = null;
      }
      return;
    }
    // Keep a pending request alive when another zoom/gesture stays inside its margin.
    // A failed request also waits for explicit retry instead of looping automatically.
    if (previousRequest && matches(previousRequest) && containsMapBounds(previousRequest.bounds, bounds)) return;

    const request: Request = { bounds: expandMapBounds(bounds, MAP_QUERY_PADDING_RATIO), owner, refreshKey, retryKey };
    requestRef.current = request;
    const isCurrent = () => mountedRef.current && requestRef.current === request && owner === getMemberSessionKey();
    void loadMapNotes(request.bounds, isCurrent).then((notes) => {
      if (!isCurrent() || !notes) return;
      setResult((previous) => ({
        cache: { ...request,
          notes: previous.cache?.owner === owner && sameNotes(previous.cache.notes, notes)
            ? previous.cache.notes : notes },
        failure: null,
      }));
    }).catch((error: unknown) => {
      if (isCurrent()) {
        const forbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);
        setResult((previous) => ({
          cache: forbidden ? null : previous.cache,
          failure: { ...request, message: error instanceof Error ? error.message : '쪽지를 불러오지 못했어요.' },
        }));
      }
    });
  }, [bounds, owner, refreshKey, retryKey, auth.status, cache, focused, appActive]);

  const enabled = Boolean(bounds && auth.status === 'authenticated');
  const retained = enabled && cache?.owner === owner ? cache : null;
  const fresh = retained && retained.refreshKey === refreshKey && retained.retryKey === retryKey
    && bounds && containsMapBounds(retained.bounds, bounds);
  const error = enabled && !fresh && failure?.owner === owner && failure.refreshKey === refreshKey
    && failure.retryKey === retryKey && bounds && containsMapBounds(failure.bounds, bounds) ? failure.message : null;
  return {
    notes: retained?.notes ?? EMPTY_NOTES,
    error,
    initialLoading: enabled && focused && appActive && !retained && !error,
    retry: () => setRetryKey((value) => value + 1),
  };
}
