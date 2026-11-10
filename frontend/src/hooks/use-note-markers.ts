import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/api/client';
import { loadMapClusters } from '@/api/map-notes';
import type { MapClusterMarker, MapViewport } from '@/api/types';
import { getAuthState, getInitialAuthState, getMemberSessionKey, subscribeAuth } from '@/auth/member-session';
import { MAP_CLUSTER_ZOOM_THRESHOLD, MAP_QUERY_DEBOUNCE_MS, MAP_QUERY_PADDING_RATIO } from '@/constants/home-map';
import { containsMapBounds, expandMapBounds } from '@/utils/map-bounds';

const EMPTY_CLUSTERS: MapClusterMarker[] = [];
type Request = MapViewport & { owner: number; refreshKey: number; retryKey: number };
type Cache = Request & { clusters: MapClusterMarker[] };
type Failure = Request & { message: string };

function sameClusters(previous: MapClusterMarker[], next: MapClusterMarker[]) {
  const fields = ['id', 'clusterId', 'latitude', 'longitude', 'count', 'noteId',
    'minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude'] as const;
  return previous.length === next.length && previous.every((cluster, index) =>
    fields.every((field) => cluster[field] === next[index][field]));
}

export function useNoteMarkers(viewport: MapViewport | null, refreshKey = 0, moving = false) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getInitialAuthState);
  const owner = getMemberSessionKey();
  const [retryKey, setRetryKey] = useState(0);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const requestRef = useRef<Request | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const hasRequestedRef = useRef(false);
  const [result, setResult] = useState<{ cache: Cache | null; failure: Failure | null }>({ cache: null, failure: null });
  const { cache, failure } = result;

  const cancelScheduled = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      requestRef.current = null;
    }
    timerRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestRef.current = null; cancelScheduled(); };
  }, [cancelScheduled]);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    setRetryKey((value) => value + 1);
    return () => { requestRef.current = null; cancelScheduled(); setFocused(false); };
  }, [cancelScheduled]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
      if (next === 'active') setRetryKey((value) => value + 1);
      else { requestRef.current = null; cancelScheduled(); }
    });
    return () => subscription.remove();
  }, [cancelScheduled]);

  useEffect(() => subscribeAuth(() => {
    const currentOwner = getMemberSessionKey();
    if (getAuthState().status !== 'authenticated' || requestRef.current && requestRef.current.owner !== currentOwner) {
      requestRef.current = null;
      cancelScheduled();
    }
    setResult((previous) => {
      if (getAuthState().status !== 'authenticated' || previous.cache && previous.cache.owner !== currentOwner
        || previous.failure && previous.failure.owner !== currentOwner) return { cache: null, failure: null };
      return previous;
    });
  }), [cancelScheduled]);

  useEffect(() => {
    // A scheduled request belongs to the last settled camera, never to a gesture in progress.
    cancelScheduled();
    if (!viewport || auth.status !== 'authenticated' || !focused || !appActive) {
      requestRef.current = null;
      return;
    }
    if (moving) return;
    const reusable = (request: Request) => request.owner === owner && request.refreshKey === refreshKey
      && request.retryKey === retryKey && Math.abs(request.zoom - viewport.zoom) < MAP_CLUSTER_ZOOM_THRESHOLD
      && containsMapBounds(request.bounds, viewport.bounds);

    if (cache && reusable(cache)) { requestRef.current = null; return; }
    if (failure && reusable(failure)) return;
    if (requestRef.current && reusable(requestRef.current)) return;

    const request: Request = { bounds: expandMapBounds(viewport.bounds, MAP_QUERY_PADDING_RATIO),
      zoom: viewport.zoom, owner, refreshKey, retryKey };
    requestRef.current = request;
    const isCurrent = () => mountedRef.current && requestRef.current === request && owner === getMemberSessionKey();
    const load = () => {
      timerRef.current = null;
      hasRequestedRef.current = true;
      void loadMapClusters(request.bounds, isCurrent).then((clusters) => {
        if (!isCurrent() || !clusters) return;
        requestRef.current = null;
        setResult((previous) => ({ cache: { ...request,
          clusters: previous.cache?.owner === owner && sameClusters(previous.cache.clusters, clusters)
            ? previous.cache.clusters : clusters }, failure: null }));
      }).catch((error: unknown) => {
        if (!isCurrent()) return;
        requestRef.current = null;
        const forbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);
        setResult((previous) => ({ cache: forbidden ? null : previous.cache,
          failure: { ...request, message: error instanceof Error ? error.message : '쪽지를 불러오지 못했어요.' } }));
      });
    };
    if (hasRequestedRef.current) timerRef.current = setTimeout(load, MAP_QUERY_DEBOUNCE_MS);
    else load();
  }, [viewport, moving, owner, refreshKey, retryKey, auth.status, cache, failure, focused, appActive, cancelScheduled]);

  const enabled = Boolean(viewport && auth.status === 'authenticated');
  const retained = enabled && cache?.owner === owner ? cache : null;
  const error = enabled && failure?.owner === owner && failure.refreshKey === refreshKey && failure.retryKey === retryKey
    && viewport && Math.abs(failure.zoom - viewport.zoom) < MAP_CLUSTER_ZOOM_THRESHOLD
    && containsMapBounds(failure.bounds, viewport.bounds) ? failure.message : null;
  return {
    clusters: retained?.clusters ?? EMPTY_CLUSTERS,
    error,
    initialLoading: enabled && focused && appActive && !retained && !error,
    retry: () => setRetryKey((value) => value + 1),
  };
}
