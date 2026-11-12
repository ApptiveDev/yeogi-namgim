import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Alert, AppState, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { CameraRef, MapRef, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import { ApiError } from '@/api/client';
import { getNoteMarkers, MAP_NOTES_LIST_PAGE_SIZE, MAP_NOTES_PAGE_SIZE } from '@/api/notes';
import type { MapBounds, MapClusterMarker, MapFilter, MapNoteLocation, MapNotePreview, MapViewport } from '@/api/types';
import { getAuthState, getMemberSessionKey, runMemberRequest, subscribeAuth } from '@/auth/member-session';
import type { NoteMapPoint } from '@/components/notes/NoteMapLayer';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW, NOTE_READ_RADIUS_METERS, USER_RADIUS_METERS } from '@/constants/home-map';
import { useNoteMarkers } from '@/hooks/use-note-markers';
import { subscribeBookmarkChanges } from '@/state/note-bookmarks';
import { createLocationCircle } from '@/utils/location-circle';

export type NoteMapSelection = {
  key: number; point: NoteMapPoint; isInside: boolean; distanceMeters: number | null; screenPoint?: [number, number];
};
export type NearbyNoteList = {
  key: number; status: 'loading' | 'ready' | 'error';
  notes: MapNotePreview[]; error: string | null;
  hasNext: boolean; loadingMore: boolean;
};

type NearbyRequest = {
  filter: MapFilter;
  key: number; owner: number; point: NoteMapPoint; bounds: readonly MapBounds[]; location: MapNoteLocation;
  range: number; page: number; hasNext: boolean; busy: boolean; notes: Map<string, MapNotePreview>;
  hasNotes: boolean; allLocked: boolean; locationRequired: boolean; nearestLocked: number | null;
  targetCount: number | null; visibleCount: number;
};

const nearbyPreviews = (request: NearbyRequest) => [...request.notes.values()]
  .slice(0, request.visibleCount)
  .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

type Options = {
  userCoordinates: Location.LocationObjectCoords | null;
  composeCoordinates: Location.LocationObjectCoords | null;
  isComposeOpen: boolean;
  isFollowingUser: boolean;
  setIsFollowingUser: Dispatch<SetStateAction<boolean>>;
  cameraRef: RefObject<CameraRef | null>;
  resumeFollowingAfterClose: RefObject<boolean>;
  notesRefreshKey: number;
  nearbySheetHeight: number;
};

export function useHomeMap({
  userCoordinates, composeCoordinates, isComposeOpen, isFollowingUser, setIsFollowingUser,
  cameraRef, resumeFollowingAfterClose: resumeFollowingAfterCloseRef, notesRefreshKey, nearbySheetHeight,
}: Options) {
  const mapRef = useRef<MapRef>(null);
  const boundsGeneration = useRef(0);
  const pressGeneration = useRef(0);
  const nearbyRequest = useRef<NearbyRequest | null>(null);
  const openingDetail = useRef(false);
  const listAnchor = useRef<[number, number] | null>(null);
  const listCameraTransition = useRef(false);
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [moving, setMoving] = useState(false);
  const [selection, setSelection] = useState<{ owner: number; value: NoteMapSelection } | null>(null);
  const [nearby, setNearby] = useState<(NearbyNoteList & { owner: number }) | null>(null);
  const { clusters: mapClusters, error: notesError, initialLoading: notesInitialLoading, retry: retryNotes }
    = useNoteMarkers(viewport, notesRefreshKey, moving, filter);

  if (isComposeOpen && selection) setSelection(null);
  if (isComposeOpen && nearby) setNearby(null);

  useEffect(() => {
    pressGeneration.current += 1;
  }, [mapClusters]);

  useEffect(() => () => { boundsGeneration.current += 1; pressGeneration.current += 1; nearbyRequest.current = null; }, []);

  const userPoint = useMemo<GeoJSON.Point | null>(() => userCoordinates ? {
    type: 'Point', coordinates: [userCoordinates.longitude, userCoordinates.latitude],
  } : null, [userCoordinates]);
  const composePoint = useMemo<GeoJSON.Point | null>(() => composeCoordinates ? {
    type: 'Point', coordinates: [composeCoordinates.longitude, composeCoordinates.latitude],
  } : null, [composeCoordinates]);
  const userCircle = useMemo(() => userCoordinates ? createLocationCircle(
    userCoordinates.longitude, userCoordinates.latitude, isComposeOpen ? USER_RADIUS_METERS : NOTE_READ_RADIUS_METERS,
  ) : null, [userCoordinates, isComposeOpen]);

  useEffect(() => {
    if (!isMapRendered || !isFollowingUser || isComposeOpen || !userPoint) return;
    cameraRef.current?.easeTo({ center: userPoint.coordinates as [number, number], zoom: DEFAULT_MAP_VIEW.zoom,
      padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: CAMERA_RETURN_DURATION, easing: 'ease' });
  }, [isMapRendered, isFollowingUser, isComposeOpen, userPoint, cameraRef]);

  const restoreMapPadding = useCallback(() => {
    const center = listAnchor.current;
    if (!center) return;
    listAnchor.current = null;
    listCameraTransition.current = true;
    cameraRef.current?.easeTo({ center, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 0 });
  }, [cameraRef]);

  const discardMapSelection = useCallback(() => {
    pressGeneration.current += 1;
    nearbyRequest.current = null;
    setSelection(null);
    setNearby(null);
  }, []);

  const clearMapSelection = useCallback(() => {
    discardMapSelection();
    restoreMapPadding();
  }, [discardMapSelection, restoreMapPadding]);

  useEffect(() => {
    if (!isComposeOpen) return;
    pressGeneration.current += 1;
    nearbyRequest.current = null;
    restoreMapPadding();
  }, [isComposeOpen, restoreMapPadding]);

  useFocusEffect(useCallback(() => {
    openingDetail.current = false;
    return () => { if (!openingDetail.current) clearMapSelection(); };
  }, [clearMapSelection]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') clearMapSelection();
    });
    return () => subscription.remove();
  }, [clearMapSelection]);

  useEffect(() => subscribeAuth(() => {
    if (getAuthState().status !== 'authenticated' || nearbyRequest.current
      && nearbyRequest.current.owner !== getMemberSessionKey()) clearMapSelection();
  }), [clearMapSelection]);

  useEffect(() => subscribeBookmarkChanges(({ owner, noteId, isSaved }) => {
    const request = nearbyRequest.current;
    if (!request || owner !== request.owner || owner !== getMemberSessionKey()) return;
    const note = request.notes.get(noteId);
    if (note) request.notes.set(noteId, { ...note, isSaved });
    setNearby((previous) => previous?.key === request.key
      ? { ...previous, notes: nearbyPreviews(request) } : previous);
  }), []);

  const showListCamera = (request: NearbyRequest) => {
    if (listAnchor.current || !cameraRef.current) return;
    const center = request.point.center;
    listAnchor.current = center;
    listCameraTransition.current = true;
    cameraRef.current.easeTo({ center, padding: { top: 0, bottom: nearbySheetHeight, left: 0, right: 0 },
      duration: reduceMotion ? 0 : CAMERA_RETURN_DURATION });
  };

  const showNearbyList = (request: NearbyRequest, error: string | null) => {
    const notes = nearbyPreviews(request);
    setNearby({ key: request.key, owner: request.owner, status: 'ready', notes,
      hasNext: request.hasNext || request.notes.size > request.visibleCount, loadingMore: false, error });
    if (notes.length) {
      const distanceMeters = notes.reduce<number | null>((nearest, note) => note.distanceMeters === null
        ? nearest : Math.min(nearest ?? Infinity, note.distanceMeters), null);
      setSelection({ owner: request.owner, value: { key: request.key, point: request.point, isInside: true,
        distanceMeters } });
    }
    showListCamera(request);
  };

  const fetchNearbyNotes = async (request: NearbyRequest) => {
    if (request.busy) return;
    request.busy = true;
    const active = () => nearbyRequest.current === request && request.owner === getMemberSessionKey()
      && AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const previousCount = Math.min(request.notes.size, request.visibleCount);
    const manualPaging = request.filter === 'MINE' || request.filter === 'SAVED';
    request.targetCount ??= previousCount + (manualPaging ? MAP_NOTES_LIST_PAGE_SIZE : MAP_NOTES_PAGE_SIZE);
    request.visibleCount = manualPaging ? request.targetCount : Infinity;
    setNearby({ key: request.key, owner: request.owner, status: previousCount ? 'ready' : 'loading', notes: nearbyPreviews(request),
      hasNext: request.hasNext || request.notes.size > request.visibleCount, loadingMore: previousCount > 0, error: null });
    try {
      while (request.hasNext && request.notes.size < request.targetCount) {
        if (!active()) return;
        const page = await runMemberRequest((token) => getNoteMarkers(request.bounds[request.range], token, request.page, request.location, request.filter));
        if (!active()) return;
        request.hasNotes ||= page.notes.length > 0;
        for (const marker of page.notes) {
          request.allLocked &&= marker.accessStatus === 'LOCKED';
          request.locationRequired ||= marker.accessStatus === 'LOCATION_REQUIRED';
          if (marker.accessStatus === 'LOCKED' && marker.distanceMeters !== null) {
            request.nearestLocked = Math.min(request.nearestLocked ?? Infinity, marker.distanceMeters);
          }
        }
        for (const note of page.openableNotes ?? []) request.notes.set(note.noteId, note);
        if (page.hasNext) request.page = page.page + 1;
        else { request.range += 1; request.page = 0; }
        request.hasNext = request.range < request.bounds.length;
      }

      if (!active()) return;
      if (!request.hasNext && !request.notes.size && request.hasNotes && request.allLocked && request.nearestLocked !== null) {
        const screenPoint = await mapRef.current?.project(request.point.center);
        if (!active()) return;
        if (!screenPoint || !screenPoint.every(Number.isFinite)) throw new Error('선택한 원의 위치를 확인하지 못했어요.');
        setNearby(null);
        setSelection({ owner: request.owner, value: { key: request.key, point: request.point, isInside: false,
          distanceMeters: request.nearestLocked, screenPoint } });
      } else if (!request.hasNext && !request.notes.size && request.locationRequired) {
        clearMapSelection();
        Alert.alert('위치 확인 필요', '현재 위치를 확인한 뒤 다시 시도해 주세요.');
      } else {
        showNearbyList(request, null);
      }
      request.targetCount = null;
    } catch (error) {
      if (!active()) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearMapSelection();
      } else {
        const message = error instanceof Error ? error.message : '쪽지 목록을 불러오지 못했어요.';
        if (request.notes.size) showNearbyList(request, message);
        else setNearby({ key: request.key, owner: request.owner, status: 'error', notes: [],
          hasNext: request.hasNext, loadingMore: false, error: message });
      }
    } finally {
      request.busy = false;
    }
  };

  const handleNotePointPress = async (point: NoteMapPoint, loadClusters?: () => Promise<readonly MapClusterMarker[]>) => {
    if (isComposeOpen || !mapRef.current || !cameraRef.current) return;
    clearMapSelection();
    resumeFollowingAfterCloseRef.current = false;
    setIsFollowingUser(false);
    const generation = pressGeneration.current;
    const owner = getMemberSessionKey();
    try {
      const zoom = await mapRef.current.getZoom();
      if (generation !== pressGeneration.current || owner !== getMemberSessionKey() || !Number.isFinite(zoom)) return;
      const duration = reduceMotion ? 0 : CAMERA_RETURN_DURATION;
      const camera = cameraRef.current;
      if (!camera) return;
      if (zoom < DEFAULT_MAP_VIEW.zoom && filter !== 'MINE' && filter !== 'SAVED') {
        camera.easeTo({ center: point.center, zoom: Math.min(zoom + 2, DEFAULT_MAP_VIEW.zoom), duration });
        return;
      }
      if (!userCoordinates) {
        Alert.alert('위치 확인 필요', '현재 위치를 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      const clusters = loadClusters ? await loadClusters() : point.clusters;
      if (generation !== pressGeneration.current || owner !== getMemberSessionKey()) return;
      if (!clusters.length) throw new Error('선택한 쪽지 묶음을 확인하지 못했어요. 다시 눌러 주세요.');
      const request: NearbyRequest = { key: generation, owner, filter, point: { ...point, clusters },
        bounds: clusters.map(({ minLatitude, maxLatitude, minLongitude, maxLongitude }) =>
          ({ minLatitude, maxLatitude, minLongitude, maxLongitude })),
        location: { latitude: userCoordinates.latitude, longitude: userCoordinates.longitude },
        range: 0, page: 0, hasNext: true, busy: false, notes: new Map(), hasNotes: false,
        allLocked: true, locationRequired: false, nearestLocked: null, targetCount: null,
        visibleCount: filter === 'MINE' || filter === 'SAVED' ? 0 : Infinity };
      nearbyRequest.current = request;
      await fetchNearbyNotes(request);
    } catch (error) {
      if (generation === pressGeneration.current && owner === getMemberSessionKey()) {
        Alert.alert('지도 쪽지 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
      }
    }
  };

  const handleRegionWillChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (!event.nativeEvent.userInteraction && (listAnchor.current || listCameraTransition.current)) return;
    boundsGeneration.current += 1;
    clearMapSelection();
    setMoving(true);
    if (event.nativeEvent.userInteraction) {
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(false);
    }
  };

  const updateMapBounds = async () => {
    const generation = ++boundsGeneration.current;
    try {
      const map = mapRef.current;
      if (!map) return;
      const [value, zoom] = await Promise.all([map.getBounds(), map.getZoom()]);
      if (generation !== boundsGeneration.current || !Number.isFinite(zoom)) return;
      const [west, south, east, north] = value;
      setViewport((previous) => previous && previous.zoom === zoom && previous.bounds.minLatitude === south
        && previous.bounds.maxLatitude === north && previous.bounds.minLongitude === west && previous.bounds.maxLongitude === east
        ? previous : { bounds: { minLatitude: south, maxLatitude: north, minLongitude: west, maxLongitude: east }, zoom });
      setMoving(false);
    } catch (error) {
      if (generation === boundsGeneration.current) {
        setMoving(false);
        Alert.alert('지도 범위 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
      }
    }
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (!event.nativeEvent.userInteraction && (listAnchor.current || listCameraTransition.current)) {
      listCameraTransition.current = false;
      return;
    }
    if (resumeFollowingAfterCloseRef.current && !event.nativeEvent.userInteraction
      && Math.abs(event.nativeEvent.zoom - DEFAULT_MAP_VIEW.zoom) < 0.02) {
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(true);
    }
  };

  const moveToCurrentLocation = async () => {
    clearMapSelection();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') setIsFollowingUser(true);
  };

  return {
    filter,
    selectFilter: (next: MapFilter) => {
      if (next === filter) return;
      clearMapSelection();
      setFilter(next);
    },
    mapRef, setIsMapReady, isMapReady, isMapRendered, setIsMapRendered, setMapError, startupError: mapError,
    userPoint, composePoint, userCircle, mapClusters, handleNotePointPress,
    notesError, notesInitialLoading, retryNotes, clearMapSelection,
    selectedMapPoint: !isComposeOpen && selection?.owner === getMemberSessionKey() ? selection.value : null,
    nearbyNotes: !isComposeOpen && nearby?.owner === getMemberSessionKey() ? nearby : null,
    loadMoreNearbyNotes: () => { if (nearbyRequest.current) void fetchNearbyNotes(nearbyRequest.current); },
    openNoteDetail: (note: MapNotePreview) => {
      const request = nearbyRequest.current;
      if (openingDetail.current || !request || request.owner !== getMemberSessionKey() || !userCoordinates) return;
      openingDetail.current = true;
      router.push({ pathname: '/note/[noteId]', params: { noteId: note.noteId,
        skipLocation: String(note.isMine || note.isSaved === true),
        latitude: String(userCoordinates.latitude), longitude: String(userCoordinates.longitude) } });
    },
    handleRegionWillChange, handleRegionDidChange, updateMapBounds, moveToCurrentLocation,
  };
}
