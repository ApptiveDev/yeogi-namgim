import { useFonts } from 'expo-font';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StartupScreen } from '@/components/StartupScreen';
import { HomeMap } from '@/components/home/HomeMap';
import { MapSelector } from '@/components/home/MapSelector';
import { NoteComposeSheet } from '@/components/notes/NoteComposeSheet';
import { NoteCreatedDialog } from '@/components/notes/NoteCreatedDialog';
import { NoteLockedDialog } from '@/components/notes/NoteLockedDialog';
import { useHomeMap } from '@/hooks/use-home-map';
import { useNoteCompose } from '@/hooks/use-note-compose';
import { useUserLocation } from '@/hooks/use-user-location';
import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const [attempt, setAttempt] = useState(0);
  return <HomeContent key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}

function HomeContent({ onRetry }: { onRetry: () => void }) {
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const [homeReady, setHomeReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
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
  const { userCoordinates, setUserCoordinates, locationStatus } = useUserLocation();
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
  const openRequestedCompose = useEffectEvent(() => {
    router.setParams({ compose: undefined });
    if (!isComposeOpen) { map.clearMapSelection(); void openCompose(); }
  });

  useEffect(() => {
    if (homeReady && compose === 'true') openRequestedCompose();
  }, [homeReady, compose]);

  useEffect(() => {
    if (homeReady || startupError) return;
    if (locationStatus === 'error') setStartupError('위치를 확인하지 못했어요. 위치 서비스를 확인하고 다시 시도해 주세요.');
    else if (map.startupError) setStartupError(map.startupError);
    else if (map.isMapReady && map.isMapRendered) setHomeReady(true);
  }, [homeReady, startupError, locationStatus, map.startupError, map.isMapReady, map.isMapRendered]);

  useEffect(() => {
    if (homeReady || startupError || locationStatus === 'permission') return;
    const timer = setTimeout(() => setStartupError('지도 준비 시간이 초과됐어요. 다시 시도해 주세요.'), 15000);
    return () => clearTimeout(timer);
  }, [homeReady, startupError, locationStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.container} pointerEvents={homeReady ? 'auto' : 'none'} accessibilityElementsHidden={!homeReady} importantForAccessibility={homeReady ? 'auto' : 'no-hide-descendants'}>
      {userCoordinates && <HomeMap
        map={map}
        initialCenter={[userCoordinates.longitude, userCoordinates.latitude]}
        cameraRef={cameraRef}
        isComposeOpen={isComposeOpen}
      />}
      <MapSelector
        isComposeOpen={isComposeOpen}
        isMapMenuOpen={isMapMenuOpen}
        setIsMapMenuOpen={setIsMapMenuOpen}
        fontsLoaded={fontsLoaded}
        fontError={fontError}
        insets={insets}
      />

      {!isComposeOpen && (map.notesInitialLoading || map.notesError) && (
        <View style={[styles.notesStatus, { top: insets.top + 72 }]} accessibilityLiveRegion="polite">
          <Text style={styles.notesStatusText}>
            {map.notesError ?? '쪽지를 불러오는 중이에요.'}
          </Text>
          {map.notesError && (
            <Pressable onPress={map.retryNotes} accessibilityRole="button" style={styles.notesRetryButton}>
              <Text style={styles.notesRetryText}>다시 시도</Text>
            </Pressable>
          )}
        </View>
      )}

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

      {!isComposeOpen && <BottomTabBar onAddPress={() => { map.clearMapSelection(); void openCompose(); }} />}

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
      <NoteLockedDialog selection={map.selectedMapPoint} onClose={map.clearMapSelection} />
      </View>
      {!homeReady && (
        <StartupScreen
          message={startupError ?? undefined}
          actionLabel={startupError ? '다시 시도' : undefined}
          onAction={onRetry}
        />
      )}
    </View>
  );
}
