import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Alert, AppState, type NativeSyntheticEvent } from 'react-native';
import type { CameraRef, GeoJSONSourceRef, MapRef, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import type { MapBounds } from '@/api/types';
import { getMemberSessionKey } from '@/auth/member-session';
import type { NoteMapItem, NoteMapPoint } from '@/components/notes/NoteMapLayer';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW, NOTE_READ_RADIUS_METERS, USER_RADIUS_METERS } from '@/constants/home-map';
import { useNoteMarkers } from '@/hooks/use-note-markers';
import { getDistanceMeters } from '@/utils/distance';
import { createLocationCircle } from '@/utils/location-circle';

export type NoteMapSelection = {
  key: number;
  point: NoteMapPoint;
  isInside: boolean;
  distanceMeters: number;
  screenPoint?: [number, number];
};

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
  height: number;
  width: number;
  insets: { top: number };
};

export function useHomeMap({
  userCoordinates, composeCoordinates, isComposeOpen,
  isFollowingUser, setIsFollowingUser, cameraRef, resumeFollowingAfterClose: resumeFollowingAfterCloseRef,
  notesRefreshKey, sheetHeight, height, width, insets,
}: Options) {
  const mapRef = useRef<MapRef>(null);
  const noteSourceRef = useRef<GeoJSONSourceRef>(null);
  const pointPressGeneration = useRef(0);
  const boundsGeneration = useRef(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selection, setSelection] = useState<{ owner: number; notes: NoteMapItem[]; value: NoteMapSelection } | null>(null);
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

  const clearMapSelection = useCallback(() => {
    pointPressGeneration.current += 1;
    setSelection(null);
  }, []);

  useEffect(() => {
    pointPressGeneration.current += 1;
    return () => { pointPressGeneration.current += 1; };
  }, [isComposeOpen, mapNotes, userCoordinates?.latitude, userCoordinates?.longitude]);

  useFocusEffect(useCallback(() => () => clearMapSelection(), [clearMapSelection]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') clearMapSelection();
    });
    return () => subscription.remove();
  }, [clearMapSelection]);

  const handleNotePointPress = async (point: NoteMapPoint) => {
    if (isComposeOpen) return;
    clearMapSelection();
    const generation = pointPressGeneration.current;
    const owner = getMemberSessionKey();
    const isCurrent = () => pointPressGeneration.current === generation && owner === getMemberSessionKey()
      && AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    if (!userCoordinates) {
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
      setSelection({ owner, notes: mapNotes, value: { key: generation, point, isInside: true, distanceMeters } });
      if (zoom >= DEFAULT_MAP_VIEW.zoom || !cameraRef.current) return;
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(false);
      cameraRef.current.easeTo({
        center: [userCoordinates.longitude, userCoordinates.latitude],
        zoom: DEFAULT_MAP_VIEW.zoom,
        duration: CAMERA_RETURN_DURATION,
      });
    } catch (error) {
      if (isCurrent()) {
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
    pointPressGeneration.current += 1;
    if (event.nativeEvent.userInteraction) {
      clearMapSelection();
      resumeFollowingAfterCloseRef.current = false;
      setIsFollowingUser(false);
    }
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
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
    selectedMapPoint: !isComposeOpen && selection?.owner === getMemberSessionKey() && selection.notes === mapNotes ? selection.value : null,
    clearMapSelection,
    handleRegionWillChange, handleRegionDidChange, updateMapBounds, moveToCurrentLocation,
  };
}
