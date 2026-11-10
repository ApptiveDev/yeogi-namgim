import * as Location from 'expo-location';
import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Keyboard, type NativeSyntheticEvent } from 'react-native';
import type { CameraRef, MapRef, ViewState, ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import { createNote } from '@/api/notes';
import { runMemberRequest } from '@/auth/member-session';
import { INITIAL_NOTE_DRAFT, type NoteDraft } from '@/components/notes/NoteComposeSheet';
import { showToast } from '@/components/ui/toast';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW } from '@/constants/home-map';

type Options = {
  userCoordinates: Location.LocationObjectCoords | null;
  setUserCoordinates: Dispatch<SetStateAction<Location.LocationObjectCoords | null>>;
  cameraRef: RefObject<CameraRef | null>;
  resumeFollowingAfterClose: RefObject<boolean>;
  setIsFollowingUser: Dispatch<SetStateAction<boolean>>;
  setNotesRefreshKey: Dispatch<SetStateAction<number>>;
};

export function useNoteCompose({
  userCoordinates, setUserCoordinates, cameraRef, resumeFollowingAfterClose: resumeFollowingAfterCloseRef,
  setIsFollowingUser, setNotesRefreshKey,
}: Options) {
  const composeRequest = useRef(0);
  const submitting = useRef(false);
  const openingCompose = useRef(false);
  const cameraTarget = useRef<Location.LocationObjectCoords | null>(null);
  const [isComposeOpening, setIsComposeOpening] = useState(false);
  const placeEdited = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(INITIAL_NOTE_DRAFT);
  const [composeCoordinates, setComposeCoordinates] = useState<Location.LocationObjectCoords | null>(null);
  const [composeLocationLabel, setComposeLocationLabel] = useState('현재 위치를 확인하고 있어요');
  const [placeName, setPlaceName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const closeCompose = useCallback(() => {
    if (submitting.current) return;
    composeRequest.current += 1;
    openingCompose.current = false;
    cameraTarget.current = null;
    setIsComposeOpening(false);
    Keyboard.dismiss();
    setIsComposeOpen(false);
    setComposeCoordinates(null);
    const coordinates = userCoordinates ?? composeCoordinates;
    resumeFollowingAfterCloseRef.current = Boolean(coordinates);
    if (coordinates) {
      cameraRef.current?.easeTo({
        center: [coordinates.longitude, coordinates.latitude], zoom: DEFAULT_MAP_VIEW.zoom,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: CAMERA_RETURN_DURATION, easing: 'ease',
      });
    }
  }, [userCoordinates, composeCoordinates, cameraRef, resumeFollowingAfterCloseRef]);

  const submitNote = async (submittedDraft: NoteDraft) => {
    const content = submittedDraft.content.trim();
    if (submitting.current || !isComposeOpen || !content || content.length > 500 || !composeCoordinates) return;
    submitting.current = true;
    setIsSubmitting(true);
    Keyboard.dismiss();
    const requestId = composeRequest.current;
    try {
      await runMemberRequest((token) => createNote({
        content, latitude: composeCoordinates.latitude, longitude: composeCoordinates.longitude,
        visibility: 'PUBLIC',
        ...(placeName.trim() && { placeName: placeName.trim() }),
        ...(neighborhood && { neighborhood }),
      }, token));
      if (requestId !== composeRequest.current) return;
      setDraft(INITIAL_NOTE_DRAFT);
      submitting.current = false;
      closeCompose();
      setNotesRefreshKey((key) => key + 1);
      showToast('쪽지를 남겼어요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '쪽지를 남기지 못했어요. 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const openIfCameraReady = useCallback(({ center, zoom, bearing, pitch }: ViewState) => {
    const target = cameraTarget.current;
    if (!target) return;
    if (Math.abs(center[0] - target.longitude) > 0.00001 || Math.abs(center[1] - target.latitude) > 0.00001
      || Math.abs(zoom - DEFAULT_MAP_VIEW.zoom) > 0.02 || Math.abs(bearing) > 0.02 || Math.abs(pitch) > 0.02) return;
    cameraTarget.current = null;
    openingCompose.current = false;
    setIsComposeOpening(false);
    setIsComposeOpen(true);
  }, []);

  const onComposeCameraIdle = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (!event.nativeEvent.userInteraction) openIfCameraReady(event.nativeEvent);
  }, [openIfCameraReady]);

  const openCompose = async (mapRef: RefObject<MapRef | null>) => {
    if (openingCompose.current || isComposeOpen) return;
    if (!userCoordinates || !cameraRef.current || !mapRef.current) {
      showToast('현재 위치와 지도를 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    openingCompose.current = true;
    setIsComposeOpening(true);
    resumeFollowingAfterCloseRef.current = false;
    const requestId = ++composeRequest.current;
    placeEdited.current = false;
    setIsFollowingUser(false);
    setComposeCoordinates(null);
    setPlaceName('');
    setNeighborhood('');
    setComposeLocationLabel('현재 위치를 확인하고 있어요');
    let cameraStarted = false;
    try {
      const viewState = await mapRef.current.getViewState();
      if (requestId !== composeRequest.current) return;
      cameraTarget.current = userCoordinates;
      openIfCameraReady(viewState);
      if (cameraTarget.current) cameraRef.current.easeTo({
        center: [userCoordinates.longitude, userCoordinates.latitude], zoom: DEFAULT_MAP_VIEW.zoom,
        bearing: 0, pitch: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: CAMERA_RETURN_DURATION, easing: 'ease',
      });
      cameraStarted = true;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (requestId !== composeRequest.current) return;
      if (status !== 'granted') throw new Error('현재 위치에 쪽지를 남기려면 위치 권한을 허용해 주세요.');
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (requestId !== composeRequest.current) return;
      if (!Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90
        || !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180) throw new Error('현재 위치를 확인할 수 없어요.');
      setUserCoordinates(coords);
      setComposeCoordinates(coords);
      setComposeLocationLabel('장소명을 입력해 주세요');
      try {
        const [address] = await Location.reverseGeocodeAsync(coords);
        if (requestId !== composeRequest.current || !address) return;
        const label = [address.street || address.district || address.city, address.streetNumber].filter(Boolean).join(' ');
        if (!placeEdited.current) setPlaceName(label.slice(0, 200));
        setNeighborhood((address.district || address.subregion || address.city || '').trim().slice(0, 100));
      } catch {
        // Address lookup is optional; the confirmed coordinates remain usable.
      }
    } catch (error) {
      if (requestId !== composeRequest.current) return;
      if (!cameraStarted) {
        openingCompose.current = false;
        cameraTarget.current = null;
        setIsComposeOpening(false);
      }
      setComposeLocationLabel('현재 위치를 확인할 수 없어요');
      showToast(error instanceof Error ? error.message : '위치 서비스를 확인한 뒤 작성 화면을 다시 열어 주세요.');
    }
  };

  return {
    isComposeOpen, isComposeOpening, onComposeCameraIdle, composeCoordinates, composeLocationLabel, placeName,
    changePlaceName: (value: string) => { placeEdited.current = true; setPlaceName(value.slice(0, 200)); },
    draft, setDraft, isSubmitting, openCompose, closeCompose, submitNote,
  };
}
