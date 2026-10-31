import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Alert, type NativeSyntheticEvent } from 'react-native';
import type { CameraRef, MapRef, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import type { MapBounds } from '@/api/types';
import type { NoteMapItem } from '@/components/notes/NoteMapLayer';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW, USER_RADIUS_METERS } from '@/constants/home-map';
import { useNoteMarkers } from '@/hooks/use-note-markers';
import { createLocationCircle } from '@/utils/location-circle';
import { getDistanceMeters } from '@/utils/distance';

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
  isFollowingUser, setIsFollowingUser, cameraRef, resumeFollowingAfterClose,
  notesRefreshKey, sheetHeight, height, width, insets,
}: Options) {
  const mapRef = useRef<MapRef>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapRendered, setIsMapRendered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const { notes } = useNoteMarkers(bounds, notesRefreshKey);
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
  const mapNotes: NoteMapItem[] = notes.map((note) => {  // 거리별 마커 설정
    const distanceMeters = userCoordinates ? getDistanceMeters(userCoordinates, note):null;
    const isInsideRadius = distanceMeters !== null && distanceMeters <= USER_RADIUS_METERS;
    let state: NoteMapItem['state'];
    if (note.isMine) {
      state = 'owned';
    } else if (isInsideRadius) {
      state = 'available';
    } else {
      state = 'locked';
    }
    return {
      id: note.noteId,
      latitude: note.latitude,
      longitude: note.longitude,
      state,
    };
  });
  const userCircle = useMemo(
    () => userCoordinates
      ? createLocationCircle(
          userCoordinates.longitude,
          userCoordinates.latitude,
          USER_RADIUS_METERS,
        )
      : null,
    [userCoordinates],
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
    if (event.nativeEvent.userInteraction) {
      resumeFollowingAfterClose.current = false;
      setIsFollowingUser(false);
    }
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (resumeFollowingAfterClose.current && !event.nativeEvent.userInteraction &&
        Math.abs(event.nativeEvent.zoom - DEFAULT_MAP_VIEW.zoom) < 0.02) {
      resumeFollowingAfterClose.current = false;
      setIsFollowingUser(true);
    }
  };

  // 내 위치 버튼
  const moveToCurrentLocation = async () => {
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
    try {
      const value = await mapRef.current?.getBounds();
      if (!value) return;
      const [west, south, east, north] = value;
      setBounds({
        minLatitude: south,
        minLongitude: west,
        maxLatitude: north,
        maxLongitude: east,
      });
    } catch (error) {
      Alert.alert('지도 범위 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요. ');
    }
  };

  return {
    mapRef, setIsMapReady, isMapReady, isMapRendered, setIsMapRendered, setMapError, startupError: mapError,
    userPoint, composePoint, userCircle, mapNotes,
    handleRegionWillChange, handleRegionDidChange, updateMapBounds, moveToCurrentLocation,
  };
}
