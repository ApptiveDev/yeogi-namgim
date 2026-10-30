import * as Location from 'expo-location';
import { useCallback, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Alert, Keyboard } from 'react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import { createNote } from '@/api/notes';
import { getGuestToken } from '@/auth/guest-token';
import { INITIAL_NOTE_DRAFT, type NoteDraft } from '@/components/notes/NoteComposeSheet';
import { CAMERA_RETURN_DURATION, DEFAULT_MAP_VIEW } from '@/constants/home-map';

type Options = {
  userCoordinates: Location.LocationObjectCoords | null;
  setUserCoordinates: Dispatch<SetStateAction<Location.LocationObjectCoords | null>>;
  cameraRef: RefObject<CameraRef | null>;
  resumeFollowingAfterClose: RefObject<boolean>;
  setIsFollowingUser: Dispatch<SetStateAction<boolean>>;
  setIsMapMenuOpen: Dispatch<SetStateAction<boolean>>;
  setNotesRefreshKey: Dispatch<SetStateAction<number>>;
  setIsCreatedDialogVisible: Dispatch<SetStateAction<boolean>>;
};

export function useNoteCompose({
  userCoordinates, setUserCoordinates, cameraRef, resumeFollowingAfterClose,
  setIsFollowingUser, setIsMapMenuOpen, setNotesRefreshKey, setIsCreatedDialogVisible,
}: Options) {
  const composeRequest = useRef(0);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(INITIAL_NOTE_DRAFT);
  const [composeCoordinates, setComposeCoordinates] = useState<Location.LocationObjectCoords | null>(null);
  const [composeLocationLabel, setComposeLocationLabel] = useState('현재 위치를 확인하고 있어요');

  const closeCompose = useCallback(() => {
    if (submitting.current) return;
    composeRequest.current += 1;
    setIsComposeOpen(false);
    setComposeCoordinates(null);
    // Keep tracking off until the camera has finished returning, so it cannot
    // override the animated zoom and viewport padding reset.
    const coordinates = userCoordinates ?? composeCoordinates;
    resumeFollowingAfterClose.current = Boolean(coordinates);
    if (coordinates) {
      cameraRef.current?.easeTo({
        center: [coordinates.longitude, coordinates.latitude],
        zoom: DEFAULT_MAP_VIEW.zoom,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: CAMERA_RETURN_DURATION,
        easing: 'ease',
      });
    } else {
      cameraRef.current?.zoomTo(DEFAULT_MAP_VIEW.zoom, {
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: CAMERA_RETURN_DURATION,
        easing: 'ease',
      });
    }
  }, [userCoordinates, composeCoordinates, cameraRef, resumeFollowingAfterClose]);

  const submitNote = async (submittedDraft: NoteDraft) => {
    const content = submittedDraft.content.trim();
    if (submitting.current || !content || !composeCoordinates) return;
    submitting.current = true;
    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('현재 위치에 쪽지를 남기려면 위치 권한을 허용해 주세요.');
      }
      let coords: Location.LocationObjectCoords;
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = location.coords;
      } catch {
        throw new Error('현재 위치를 확인할 수 없어요. 위치 서비스를 확인해 주세요.');
      }
      const token = await getGuestToken();
      // Visibility is not part of the current backend contract.
      await createNote({ content, latitude: coords.latitude, longitude: coords.longitude }, token);
      setUserCoordinates(coords);
      setDraft(INITIAL_NOTE_DRAFT);
      submitting.current = false;
      closeCompose();
      setNotesRefreshKey((key) => key + 1);
      setIsCreatedDialogVisible(true);
    } catch (error) {
      Alert.alert('쪽지 남기기 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const openCompose = async () => {
    resumeFollowingAfterClose.current = false;
    const requestId = ++composeRequest.current;
    setIsMapMenuOpen(false);
    setIsComposeOpen(true);
    setIsFollowingUser(false);
    setComposeCoordinates(userCoordinates);
    setComposeLocationLabel(userCoordinates ? '현재 위치' : '현재 위치를 확인하고 있어요');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (requestId !== composeRequest.current) return;
      if (status !== 'granted') {
        setComposeCoordinates(null);
        setComposeLocationLabel('위치 권한이 필요해요');
        Alert.alert('위치 권한 필요', '현재 위치에 쪽지를 남기려면 위치 권한을 허용해 주세요.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (requestId !== composeRequest.current) return;
      setUserCoordinates(coords);
      setComposeCoordinates(coords);
      setComposeLocationLabel('현재 위치');
      try {
        const [address] = await Location.reverseGeocodeAsync(coords);
        if (requestId !== composeRequest.current || !address) return;
        const label = [address.street || address.district || address.city, address.streetNumber]
          .filter(Boolean).join(' ');
        if (label) setComposeLocationLabel(label);
      } catch {
        // Address lookup is optional; the confirmed coordinates remain usable.
      }
    } catch {
      if (requestId !== composeRequest.current) return;
      if (userCoordinates) return;
      setComposeLocationLabel('현재 위치를 확인할 수 없어요');
      Alert.alert('위치 확인 실패', '위치 서비스를 확인한 뒤 작성 화면을 다시 열어 주세요.');
    }
  };

  return {
    isComposeOpen, composeCoordinates, composeLocationLabel,
    draft, setDraft, isSubmitting, openCompose, closeCompose, submitNote,
  };
}
