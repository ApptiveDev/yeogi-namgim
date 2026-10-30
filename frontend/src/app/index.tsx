import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import { HomeMap } from '@/components/home/HomeMap';
import { MapSelector } from '@/components/home/MapSelector';
import { NoteComposeSheet } from '@/components/notes/NoteComposeSheet';
import { NoteCreatedDialog } from '@/components/notes/NoteCreatedDialog';
import { NoteReadDialog } from '@/components/notes/NoteReadDialog';
import { useHomeMap } from '@/hooks/use-home-map';
import { useNoteCompose } from '@/hooks/use-note-compose';
import { useNoteReader } from '@/hooks/use-note-reader';
import { useUserLocation } from '@/hooks/use-user-location';
import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);
  const resumeFollowingAfterClose = useRef(false);
  const [isCreatedDialogVisible, setIsCreatedDialogVisible] = useState(false);
  const sheetHeight = Math.min(540, height * 0.66, height - insets.top - 140);
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.ttf'),
  });
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isFollowingUser, setIsFollowingUser] =
    useState(true);
  const { userCoordinates, setUserCoordinates } = useUserLocation();
  const {
    isComposeOpen, composeCoordinates, composeLocationLabel,
    draft, setDraft, isSubmitting, openCompose, closeCompose, submitNote,
  } = useNoteCompose({
    userCoordinates, setUserCoordinates, cameraRef, resumeFollowingAfterClose,
    setIsFollowingUser, setIsMapMenuOpen, setNotesRefreshKey, setIsCreatedDialogVisible,
  });
  const map = useHomeMap({
    userCoordinates, composeCoordinates, isComposeOpen,
    isFollowingUser, setIsFollowingUser, cameraRef, resumeFollowingAfterClose,
    notesRefreshKey, sheetHeight, height, width, insets,
  });
  const { selectedNote, setSelectedNote, handleOpenNote } = useNoteReader({
    isComposeOpen, setUserCoordinates,
  });

  return (
    <View style={styles.container}>
      <HomeMap
        map={map}
        cameraRef={cameraRef}
        isComposeOpen={isComposeOpen}
        handleOpenNote={handleOpenNote}
      />
      <MapSelector
        isComposeOpen={isComposeOpen}
        isMapMenuOpen={isMapMenuOpen}
        setIsMapMenuOpen={setIsMapMenuOpen}
        fontsLoaded={fontsLoaded}
        fontError={fontError}
        insets={insets}
      />

      {!isComposeOpen && <Pressable
        style={[
          styles.locationButton,
          isFollowingUser &&
            styles.locationButtonActive,
        ]}
        onPress={map.moveToCurrentLocation}
      >
        <Text style={styles.locationIcon}>
          ⌖
        </Text>
      </Pressable>}

      {!isComposeOpen && <Pressable
        accessibilityRole="button"
        accessibilityLabel="쪽지 작성하기"
        onPress={openCompose}
        style={({ pressed }) => [
          styles.composeButton,
          pressed && styles.composeButtonPressed,
        ]}
      >
        <Image
          source={require('../../assets/images/compose-note.svg')}
          style={styles.composeIcon}
          contentFit="contain"
        />
      </Pressable>}

      {isComposeOpen && (
        <NoteComposeSheet
          height={sheetHeight}
          draft={draft}
          onChange={setDraft}
          locationLabel={composeLocationLabel}
          locationReady={Boolean(composeCoordinates)}
          onClose={closeCompose}
          onSubmit={submitNote}
          isSubmitting={isSubmitting}
        />
      )}
      <NoteCreatedDialog
        visible={isCreatedDialogVisible}
        onConfirm={() => setIsCreatedDialogVisible(false)}
      />
      <NoteReadDialog
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </View>
  );
}
