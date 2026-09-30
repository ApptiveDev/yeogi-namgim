import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
  type ViewStateChangeEvent,
  UserLocation,
} from '@maplibre/maplibre-react-native';

import { styles } from '../styles/home.styles';

import { localizedMapStyle } from '@/styles/map-style';
import { createLocationCircle } from '@/utils/location-circle';
import { INITIAL_NOTE_DRAFT, NoteComposeSheet, type NoteDraft } from '@/components/notes/NoteComposeSheet';
import { NotePlacementPreview, NotePlacementPreviewImages } from '@/components/notes/NotePlacementPreview';
import { ComposeMapDimmer } from '@/components/notes/ComposeMapDimmer';
import { COMPOSE_DIM_DURATION, COMPOSE_DIM_OPACITY } from '@/components/notes/compose-transitions';
import type { FeatureCollection } from 'geojson';

const USER_RADIUS_METERS = 100;
const MAP_OPTIONS = ['공개지도', '개인지도'] as const;
const DEFAULT_MAP_VIEW = { zoom: 16 };
const CAMERA_RETURN_DURATION = 600;
const EMPTY_RADIUS: FeatureCollection = { type: 'FeatureCollection', features: [] };
const BASE_MAP_TOP_LAYER = localizedMapStyle.layers.at(-1)?.id;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);
  const resumeFollowingAfterClose = useRef(false);
  const composeRequest = useRef(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const selectorShadeOpacity = useRef(new Animated.Value(0)).current;
  const [draft, setDraft] = useState<NoteDraft>(INITIAL_NOTE_DRAFT);
  const [composeCoordinates, setComposeCoordinates] = useState<Location.LocationObjectCoords | null>(null);
  const [composeLocationLabel, setComposeLocationLabel] = useState('현재 위치를 확인하고 있어요');
  const sheetHeight = Math.min(540, height * 0.66, height - insets.top - 140);
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.ttf'),
  });
  const [selectedMap, setSelectedMap] = useState<typeof MAP_OPTIONS[number]>('공개지도');
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isFollowingUser, setIsFollowingUser] =
    useState(true);
  const [userCoordinates, setUserCoordinates] =
    useState<Location.LocationObjectCoords | null>(null);
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
    const animation = Animated.timing(selectorShadeOpacity, {
      toValue: isComposeOpen ? COMPOSE_DIM_OPACITY : 0,
      duration: COMPOSE_DIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isComposeOpen, selectorShadeOpacity]);

  const closeCompose = useCallback(() => {
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
  }, [userCoordinates, composeCoordinates]);

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

  useEffect(() => {
    if (!isComposeOpen || !composeCoordinates) return;
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
  }, [isComposeOpen, composeCoordinates, sheetHeight, height, width, insets.top]);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null =
      null;

    const startLocationTracking = async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (cancelled) return;

      if (status !== 'granted') {
        console.log('위치 권한이 거부되었습니다.');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 1000,
        },
        ({ coords }) => {
          if (!cancelled) setUserCoordinates(coords);
        },
      );
      if (cancelled) subscription.remove();
    };

    startLocationTracking().catch((error) => {
      console.warn('위치를 가져오지 못했습니다.', error);
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

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

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={localizedMapStyle}
        logo={false}
        attribution={false}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={handleRegionDidChange}
      >
        <Camera
          ref={cameraRef}
          initialViewState={DEFAULT_MAP_VIEW}
          trackUserLocation={
            isFollowingUser
              ? 'default'
              : undefined
          }
        />

        
        {/* Keep these layers mounted so asynchronous location updates cannot reorder them. */}
          <GeoJSONSource id="user-radius" data={userCircle ?? EMPTY_RADIUS}>
            <Layer
              id="user-radius-fill"
              type="fill"
              afterId={BASE_MAP_TOP_LAYER}
              paint={{
                'fill-color': '#EDB84A',
                'fill-opacity': 0.18,
                'fill-antialias': false,
              }}
            />
            <Layer
              id="user-radius-outline"
              type="line"
              afterId="user-radius-fill"
              paint={{
                'line-color': '#D2643E',
                'line-opacity': 0.7,
                'line-width': 1.5,
                'line-dasharray': [5, 4],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </GeoJSONSource>
        <ComposeMapDimmer visible={isComposeOpen} />
        <NotePlacementPreviewImages />

        {/* 유저 위치 표기 마커 */}
        <UserLocation animated>
          <Layer
            id="user-location-marker"
            type="circle"
            beforeId="compose-map-dim"
            paint={{
              'circle-radius': 6,
              'circle-color': '#3B2A20',
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 3,
              'circle-pitch-alignment': 'map',
            }}
          />
          {isComposeOpen && <NotePlacementPreview />}
        </UserLocation>
      </Map>

      {isMapMenuOpen && (
        <Pressable
          style={styles.mapMenuBackdrop}
          accessibilityRole="button"
          accessibilityLabel="지도 선택 메뉴 닫기"
          onPress={() => setIsMapMenuOpen(false)}
        />
        )}

        {/* 공개지도, 개인지도 메뉴 */}
      {(fontsLoaded || fontError) && (
        <View style={[styles.mapSelectorContainer, { top: insets.top + 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`지도 선택, ${selectedMap}`}
            accessibilityState={{ expanded: isMapMenuOpen }}
            disabled={isComposeOpen}
            onPress={() => setIsMapMenuOpen((open) => !open)}
            style={styles.mapSelector}
          >
            <Text style={[
              styles.mapSelectorLabel,
              !fontsLoaded && styles.mapSelectorFontFallback,
            ]}>
              {selectedMap}
            </Text>
            <Image
              source={require('../../assets/images/chevron-down.svg')}
              style={styles.mapSelectorChevron}
              contentFit="contain"
            />
          </Pressable>

          {isMapMenuOpen && (
            <View style={styles.mapMenu}>
              {MAP_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMap === option }}
                  onPress={() => {
                    setSelectedMap(option);
                    setIsMapMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.mapMenuItem,
                    (pressed || selectedMap === option) && styles.mapMenuItemSelected,
                  ]}
                >
                  <Text style={[
                    styles.mapSelectorLabel,
                    !fontsLoaded && styles.mapSelectorFontFallback,
                  ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Animated.View
            pointerEvents="none"
            style={[styles.mapSelectorShade, { opacity: selectorShadeOpacity }]}
          />
        </View>
      )}

      {!isComposeOpen && <Pressable
        style={[
          styles.locationButton,
          isFollowingUser &&
            styles.locationButtonActive,
        ]}
        onPress={moveToCurrentLocation}
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
        />
      )}
    </View>
  );
}
