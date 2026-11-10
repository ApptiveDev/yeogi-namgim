import { useFonts } from 'expo-font';
import { router, Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CameraRef } from '@maplibre/maplibre-react-native';

import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StartupScreen } from '@/components/StartupScreen';
import { HomeMap } from '@/components/home/HomeMap';
import { MapSelector } from '@/components/home/MapSelector';
import { NoteComposeSheet } from '@/components/notes/NoteComposeSheet';
import { NoteLockedDialog } from '@/components/notes/NoteLockedDialog';
import { NearbyNotesSheet } from '@/components/notes/NearbyNotesSheet';
import { useHomeMap } from '@/hooks/use-home-map';
import { useNoteCompose } from '@/hooks/use-note-compose';
import { useUserLocation } from '@/hooks/use-user-location';
import { styles } from '@/styles/home.styles';

type StartupStatus = 'loading' | 'ready' | { error: string };

export default function HomeScreen() {
  const [attempt, setAttempt] = useState(0);
  return <HomeContent key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}

function HomeContent({ onRetry }: { onRetry: () => void }) {
  const isReadingNote = usePathname().startsWith('/note/');
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const [startup, setStartup] = useState<StartupStatus>('loading');
  const homeReady = startup === 'ready';
  const startupError = typeof startup === 'object' ? startup.error : null;
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);
  const resumeFollowingAfterClose = useRef(false);
  const nearbySheetHeight = Math.min(height * 506 / 852, height - insets.top - 140);
  const [fontsLoaded, fontError] = useFonts({
    NanumPen: require('../../assets/fonts/NanumPenScript-Regular.ttf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.ttf'),
    'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
  });
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isFollowingUser, setIsFollowingUser] =
    useState(true);
  const { userCoordinates, setUserCoordinates, locationStatus } = useUserLocation();
  const {
    isComposeOpen, isComposeOpening, onComposeCameraIdle, composeCoordinates, composeLocationLabel, placeName, changePlaceName,
    draft, setDraft, isSubmitting, openCompose, closeCompose, submitNote,
  } = useNoteCompose({
    userCoordinates, setUserCoordinates, cameraRef, resumeFollowingAfterClose,
    setIsFollowingUser, setIsMapMenuOpen, setNotesRefreshKey,
  });
  const map = useHomeMap({
    userCoordinates, composeCoordinates, isComposeOpen,
    isFollowingUser, setIsFollowingUser, cameraRef, resumeFollowingAfterClose,
    notesRefreshKey, nearbySheetHeight,
  });

  if (startup === 'loading') {
    const error = locationStatus === 'error'
      ? '위치를 확인하지 못했어요. 위치 서비스를 확인하고 다시 시도해 주세요.'
      : map.startupError;
    if (error) setStartup({ error });
    else if (map.isMapReady && map.isMapRendered) setStartup('ready');
  }

  const openRequestedCompose = useEffectEvent(() => {
    router.setParams({ compose: undefined });
    if (!isComposeOpen) { map.clearMapSelection(); void openCompose(map.mapRef); }
  });

  useEffect(() => {
    if (homeReady && compose === 'true') openRequestedCompose();
  }, [homeReady, compose]);

  useEffect(() => {
    if (startup !== 'loading' || locationStatus === 'permission') return;
    const timer = setTimeout(() => {
      setStartup((current) => current === 'loading'
        ? { error: '지도 준비 시간이 초과됐어요. 다시 시도해 주세요.' }
        : current);
    }, 15000);
    return () => clearTimeout(timer);
  }, [startup, locationStatus]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ statusBarStyle: isComposeOpen ? 'light' : 'dark' }} />
      <View style={styles.container} pointerEvents={homeReady && !isReadingNote && !isComposeOpening ? 'auto' : 'none'} accessibilityElementsHidden={!homeReady || isReadingNote} importantForAccessibility={homeReady && !isReadingNote ? 'auto' : 'no-hide-descendants'}>
      {userCoordinates && <HomeMap
        map={map}
        initialCenter={[userCoordinates.longitude, userCoordinates.latitude]}
        cameraRef={cameraRef}
        isComposeOpen={isComposeOpen}
        onComposeCameraIdle={onComposeCameraIdle}
      />}
      <View style={[StyleSheet.absoluteFill, isReadingNote && { opacity: 0 }]} pointerEvents={isReadingNote ? 'none' : 'box-none'}>
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

      {!isComposeOpen && !map.nearbyNotes && <Pressable
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

      {!isComposeOpen && !map.nearbyNotes && <BottomTabBar onAddPress={() => { map.clearMapSelection(); void openCompose(map.mapRef); }} />}

      {isComposeOpen && (
        <NoteComposeSheet
          draft={draft}
          onChange={setDraft}
          locationLabel={composeLocationLabel}
          placeName={placeName}
          onPlaceNameChange={changePlaceName}
          locationReady={Boolean(composeCoordinates)}
          onClose={closeCompose}
          onSubmit={submitNote}
          isSubmitting={isSubmitting}
        />
      )}
      <NoteLockedDialog selection={map.selectedMapPoint} onClose={map.clearMapSelection} />
      {map.nearbyNotes && <NearbyNotesSheet key={map.nearbyNotes.key} list={map.nearbyNotes} height={nearbySheetHeight}
        onClose={map.clearMapSelection} onRetry={map.loadMoreNearbyNotes} onLoadMore={map.loadMoreNearbyNotes}
        onOpen={map.openNoteDetail} />}
      </View>
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
