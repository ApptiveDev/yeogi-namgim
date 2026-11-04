import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Alert, AppState, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { CameraRef, GeoJSONSourceRef, MapRef, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import { loadMapNotePreviews } from '@/api/map-notes';
import type { MapBounds, MapNoteLocation, MapNotePreview } from '@/api/types';
import { getMemberSessionKey } from '@/auth/member-session';
import type { NoteMapItem, NoteMapPoint } from '@/components/notes/NoteMapLayer';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW, NOTE_READ_RADIUS_METERS, USER_RADIUS_METERS } from '@/constants/home-map';
import { useNoteMarkers } from '@/hooks/use-note-markers';
import { subscribeBookmarkChanges } from '@/state/note-bookmarks';
import { getDistanceMeters } from '@/utils/distance';
import { createLocationCircle } from '@/utils/location-circle';

export type NoteMapSelection = {
  key: number;
  point: NoteMapPoint;
  isInside: boolean;
  distanceMeters: number;
  screenPoint?: [number, number];
};

export type NearbyNoteList = {
  key: number;
  status: 'zooming' | 'loading' | 'ready' | 'error';
  notes: (MapNotePreview & { distanceMeters: number })[];
  error: string | null;
};

type NearbyRequest = { key: number; owner: number; bounds: MapBounds; location: MapNoteLocation; ids: Set<string> };

type Options = {
  userCoordinates: Location.LocationObjectCoords | null;
  composeCoordinates: Location.LocationObjectCoords | null;
  isComposeOpen: boolean;
  isFollowingUser: boolean;
  setIsFollowingUser: Dispatch<SetStateAction<boolean>>;
  cameraRef: RefObject<CameraRef | null>;
  resumeFollowingAfterClose: RefObject<boolean>;
  notesRefreshKey: number;
  sheetHeight: number;
  nearbySheetHeight: number;
  height: number;
  width: number;
  insets: { top: number };
};

export function useHomeMap({
  userCoordinates, composeCoordinates, isComposeOpen,
  isFollowingUser, setIsFollowingUser, cameraRef, resumeFollowingAfterClose: resumeFollowingAfterCloseRef,
  notesRefreshKey, sheetHeight, nearbySheetHeight, height, width, insets,
}: Options) {
  const openingDetail = useRef(false);
  const mapRef = useRef<MapRef>(null);
  const noteSourceRef = useRef<GeoJSONSourceRef>(null);
  const pointPressGeneration = useRef(0);
  const boundsGeneration = useRef(0);
  const nearbyGeneration = useRef(0);
  const pendingNearby = useRef<NearbyRequest | null>(null);
  const listCameraTransition = useRef(false);
  const listAnchor = useRef<[number, number] | null>(null);
  const reduceMotion = useReducedMotion();
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selection, setSelection] = useState<{ owner: number; notes: NoteMapItem[]; value: NoteMapSelection } | null>(null);
  const [nearby, setNearby] = useState<{ request: NearbyRequest; value: NearbyNoteList } | null>(null);
  useEffect(() => subscribeBookmarkChanges(({ owner, noteId, isSaved }) => {
    if (owner !== getMemberSessionKey()) return;
    setNearby((previous) => previous?.request.owner === owner ? {
      ...previous,
      value: { ...previous.value, notes: previous.value.notes.map((note) =>
        note.noteId === noteId ? { ...note, isSaved } : note) },
    } : previous);
  }), []);
  const { notes, error: notesError, initialLoading: notesInitialLoading, retry: retryNotes } = useNoteMarkers(bounds, notesRefreshKey);
  const userPoint = useMemo<GeoJSON.Point | null>(() => userCoordinates ? {
    type: 'Point',
    coordinates: [userCoordinates.longitude, userCoordinates.latitude],
  } : null, [userCoordinates]);
  const composePoint = useMemo<GeoJSON.Point | null>(() => composeCoordinates ? {
    type: 'Point',
    coordinates: [composeCoordinates.longitude, composeCoordinates.latitude],
  } : null, [composeCoordinates]);

  useEffect(() => {
    if (!isMapRendered || !isFollowingUser || isComposeOpen || !userPoint) return;
    cameraRef.current?.easeTo({
      center: userPoint.coordinates as [number, number],
      zoom: DEFAULT_MAP_VIEW.zoom,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: CAMERA_RETURN_DURATION,
      easing: 'ease',
    });
  }, [isMapRendered, isFollowingUser, isComposeOpen, userPoint, cameraRef]);
  const userLatitude = userCoordinates?.latitude;
  const userLongitude = userCoordinates?.longitude;
  const mapNotes = useMemo<NoteMapItem[]>(() => {
    const location = userLatitude !== undefined && userLongitude !== undefined
      ? { latitude: userLatitude, longitude: userLongitude } : null;
    return notes.map((note) => ({
      id: note.noteId, latitude: note.latitude, longitude: note.longitude,
      isWithinRadius: !!location && getDistanceMeters(location, note) <= NOTE_READ_RADIUS_METERS,
    }));
  }, [notes, userLatitude, userLongitude]);

  const restoreMapPadding = useCallback(() => {
    const center = listAnchor.current;
    if (!center) return;
    listAnchor.current = null;
    listCameraTransition.current = true;
    cameraRef.current?.easeTo({ center, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 0 });
  }, [cameraRef]);

  const discardMapSelection = useCallback(() => {
    pointPressGeneration.current += 1;
    nearbyGeneration.current += 1;
    pendingNearby.current = null;
    setSelection(null);
    setNearby(null);
  }, []);

  const clearMapSelection = useCallback(() => {
    discardMapSelection();
    restoreMapPadding();
  }, [discardMapSelection, restoreMapPadding]);

  const fetchNearbyNotes = async (request: NearbyRequest) => {
    const generation = ++nearbyGeneration.current;
    const isCurrent = () => generation === nearbyGeneration.current && request.owner === getMemberSessionKey()
      && AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    setNearby({ request, value: { key: request.key, status: 'loading', notes: [], error: null } });
    try {
      const result = await loadMapNotePreviews(request.bounds, request.location, isCurrent);
      if (!result || !isCurrent()) return;
      const available = result.filter((note): note is MapNotePreview & { distanceMeters: number } =>
        request.ids.has(note.noteId) && note.distanceMeters !== null && note.distanceMeters <= NOTE_READ_RADIUS_METERS)
        .sort((a, b) => a.distanceMeters - b.distanceMeters || a.noteId.localeCompare(b.noteId));
      setNearby({ request, value: { key: request.key, status: 'ready', notes: available, error: null } });
    } catch (error) {
      if (isCurrent()) setNearby({ request, value: { key: request.key, status: 'error', notes: [],
        error: error instanceof Error ? error.message : '쪽지 목록을 불러오지 못했어요.' } });
    }
  };

  useEffect(() => {
    pointPressGeneration.current += 1;
    return () => { pointPressGeneration.current += 1; };
  }, [isComposeOpen, mapNotes]);

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

  const handleNotePointPress = async (point: NoteMapPoint) => {
    if (isComposeOpen) return;
    discardMapSelection();
    const generation = pointPressGeneration.current;
    const owner = getMemberSessionKey();
    const isCurrent = () => pointPressGeneration.current === generation && owner === getMemberSessionKey()
      && AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    if (!userCoordinates) {
      restoreMapPadding();
      Alert.alert('위치 확인 필요', '현재 위치를 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    try {
      const ids = point.clusterId === undefined ? [point.noteId]
        : (await noteSourceRef.current?.getClusterLeaves(point.clusterId, point.count, 0))
          ?.map((feature) => feature.properties?.noteId);
      if (!isCurrent()) return;
      const byId = new Map(mapNotes.map((note) => [note.id, note]));
      if (!ids || ids.length !== point.count || new Set(ids).size !== ids.length
        || ids.some((id) => typeof id !== 'string' || !byId.has(id))) {
        throw new Error('선택한 묶음이 바뀌었어요. 원을 다시 눌러 주세요.');
      }
      const distanceMeters = Math.min(...ids.map((id) => getDistanceMeters(userCoordinates, byId.get(id)!)));
      if (distanceMeters > NOTE_READ_RADIUS_METERS) {
        restoreMapPadding();
        const screenPoint = await mapRef.current?.project(point.center);
        if (!isCurrent()) return;
        if (!screenPoint || screenPoint.length !== 2 || !screenPoint.every(Number.isFinite)) {
          throw new Error('선택한 원의 위치를 확인하지 못했어요. 원을 다시 눌러 주세요.');
        }
        resumeFollowingAfterCloseRef.current = false;
        setIsFollowingUser(false);
        setSelection({ owner, notes: mapNotes, value: { key: generation, point, isInside: false, distanceMeters, screenPoint } });
        return;
      }
      const zoom = await mapRef.current?.getZoom();
      if (!isCurrent() || zoom === undefined) return;
      if (!Number.isFinite(zoom)) {
        throw new Error('지도 확대 수준을 확인하지 못했어요. 다시 시도해 주세요.');
      }
      if (zoom >= DEFAULT_MAP_VIEW.zoom) {
        setSelection({ owner, notes: mapNotes, value: { key: generation, point, isInside: true, distanceMeters } });
      }
      if (zoom >= DEFAULT_MAP_VIEW.zoom || cameraRef.current) {
        const members = ids.map((id) => byId.get(id)!)
          .filter((note) => getDistanceMeters(userCoordinates, note) <= NOTE_READ_RADIUS_METERS);
        const longitudes = members.map((note) => userCoordinates.longitude
          + ((note.longitude - userCoordinates.longitude + 540) % 360) - 180);
        const latitude = members.map((note) => note.latitude);
        const request: NearbyRequest = {
          key: generation, owner,
          location: { latitude: userCoordinates.latitude, longitude: userCoordinates.longitude },
          ids: new Set(members.map((note) => note.id)),
          bounds: {
            minLatitude: Math.max(-90, Math.min(...latitude) - 1e-7),
            maxLatitude: Math.min(90, Math.max(...latitude) + 1e-7),
            minLongitude: Math.min(...longitudes) - 1e-7,
            maxLongitude: Math.max(...longitudes) + 1e-7,
          },
        };
        resumeFollowingAfterCloseRef.current = false;
        setIsFollowingUser(false);
        if (zoom < DEFAULT_MAP_VIEW.zoom) {
          pendingNearby.current = request;
          setNearby({ request, value: { key: request.key, status: 'zooming', notes: [], error: null } });
        } else {
          void fetchNearbyNotes(request);
        }
        if (!listAnchor.current && cameraRef.current) {
          listAnchor.current = [userCoordinates.longitude, userCoordinates.latitude];
          listCameraTransition.current = true;
          cameraRef.current.easeTo({ center: [userCoordinates.longitude, userCoordinates.latitude],
            ...(zoom < DEFAULT_MAP_VIEW.zoom && { zoom: DEFAULT_MAP_VIEW.zoom }),
            padding: { top: 0, bottom: nearbySheetHeight, left: 0, right: 0 }, duration: reduceMotion ? 0 : CAMERA_RETURN_DURATION });
        }
        return;
      }
      restoreMapPadding();
    } catch (error) {
      if (isCurrent()) {
        clearMapSelection();
        Alert.alert('지도 쪽지 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
      }
    }
  };
  const userCircle = useMemo(
    () => userCoordinates
      ? createLocationCircle(
          userCoordinates.longitude,
          userCoordinates.latitude,
          isComposeOpen ? USER_RADIUS_METERS : NOTE_READ_RADIUS_METERS,
        )
      : null,
    [userCoordinates, isComposeOpen],
  );

  useEffect(() => {
    if (!isMapReady || !isComposeOpen || !composeCoordinates) return;
    const topPadding = insets.top + 100;
    const visibleSize = Math.max(60, Math.min(width - 48, height - sheetHeight - topPadding) * 0.85);
    const zoom = Math.max(12, Math.min(16,
      Math.log2(156543.03392 * Math.cos(composeCoordinates.latitude * Math.PI / 180) * visibleSize / (USER_RADIUS_METERS * 2)),
    ));
    cameraRef.current?.easeTo({
      center: [composeCoordinates.longitude, composeCoordinates.latitude],
      zoom,
      bearing: 0,
      pitch: 0,
      padding: { top: topPadding, bottom: sheetHeight, left: 24, right: 24 },
      duration: 500,
    });
  }, [isMapReady, isComposeOpen, composeCoordinates, sheetHeight, height, width, insets.top, cameraRef]);

  // 사용자가 지도를 직접 조작하면
  // 내 위치 고정을 해제
  const handleRegionWillChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    // Sheet padding moves the camera without cancelling the selected cluster.
    if (!event.nativeEvent.userInteraction && (listAnchor.current || listCameraTransition.current)) return;
    pointPressGeneration.current += 1;
    if (event.nativeEvent.userInteraction) {
      clearMapSelection();
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(false);
    }
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (!event.nativeEvent.userInteraction && (listAnchor.current || listCameraTransition.current)) {
      listCameraTransition.current = false;
      const request = pendingNearby.current;
      if (request) {
        pendingNearby.current = null;
        if (request.owner === getMemberSessionKey() && event.nativeEvent.zoom >= DEFAULT_MAP_VIEW.zoom - 0.02
          && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') {
          void fetchNearbyNotes(request);
        } else {
          clearMapSelection();
        }
      }
      return;
    }
    clearMapSelection();
    if (resumeFollowingAfterCloseRef.current && !event.nativeEvent.userInteraction &&
        Math.abs(event.nativeEvent.zoom - DEFAULT_MAP_VIEW.zoom) < 0.02) {
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(true);
    }
  };

  // 내 위치 버튼
  const moveToCurrentLocation = async () => {
    clearMapSelection();
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('위치 권한이 거부되었습니다.');
      return;
    }

    // 다시 내 위치 고정
    setIsFollowingUser(true);
  };

  // 마커 갱신
  const updateMapBounds = async () => {
    const generation = ++boundsGeneration.current;
    try {
      const value = await mapRef.current?.getBounds();
      if (!value || generation !== boundsGeneration.current) return;
      const [west, south, east, north] = value;
      const next = {
        minLatitude: south,
        minLongitude: west,
        maxLatitude: north,
        maxLongitude: east,
      };
      setBounds((previous) => previous
        && previous.minLatitude === south && previous.minLongitude === west
        && previous.maxLatitude === north && previous.maxLongitude === east ? previous : next);
    } catch (error) {
      if (generation === boundsGeneration.current) {
        Alert.alert('지도 범위 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요. ');
      }
    }
  };

  return {
    mapRef, setIsMapReady, isMapReady, isMapRendered, setIsMapRendered, setMapError, startupError: mapError,
    userPoint, composePoint, userCircle, mapNotes, noteSourceRef, handleNotePointPress,
    notesError, notesInitialLoading, retryNotes,
    selectedMapPoint: !isComposeOpen && selection?.owner === getMemberSessionKey()
      && (selection.notes === mapNotes || nearby?.request.key === selection.value.key) ? selection.value : null,
    nearbyNotes: !isComposeOpen && nearby?.request.owner === getMemberSessionKey() ? nearby.value : null,
    retryNearbyNotes: () => { if (nearby) void fetchNearbyNotes(nearby.request); },
    openNoteDetail: (note: MapNotePreview) => {
      if (openingDetail.current) return;
      openingDetail.current = true;
      router.push({ pathname: '/note/[noteId]', params: { noteId: note.noteId, skipLocation: String(note.isMine || note.isSaved) } });
    },
    clearMapSelection,
    handleRegionWillChange, handleRegionDidChange, updateMapBounds, moveToCurrentLocation,
  };
}
