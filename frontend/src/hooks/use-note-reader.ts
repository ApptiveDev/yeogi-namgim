import * as Location from 'expo-location';
import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';

import { openNote } from '@/api/notes';
import { readSavedGuestToken } from '@/auth/guest-token';
import type { NoteMapItem } from '@/components/notes/NoteMapLayer';
import type { ReadableNote } from '@/components/notes/NoteReadDialog';

type Options = {
  isComposeOpen: boolean;
  setUserCoordinates: Dispatch<SetStateAction<Location.LocationObjectCoords | null>>;
};

export function useNoteReader({ isComposeOpen, setUserCoordinates }: Options) {
  const openingNote = useRef(false);
  const [selectedNote, setSelectedNote] = useState<ReadableNote | null>(null);

  const handleOpenNote = async (note: NoteMapItem) => {
    if (isComposeOpen || openingNote.current) return;

    openingNote.current = true;

    try {
      const token = await readSavedGuestToken();
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserCoordinates(coords);
      const openedNote = await openNote(
        note.id,
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        token,
      );
      setSelectedNote({
        ...openedNote,
        latitude: note.latitude,
        longitude: note.longitude,
      });
    } catch (error) {
      Alert.alert(
        '쪽지를 열 수 없어요',
        error instanceof Error ? error.message : '다시 시도해 주세요.',
      );
    } finally {
      openingNote.current = false;
    }
  };

  return { selectedNote, setSelectedNote, handleOpenNote };
}
