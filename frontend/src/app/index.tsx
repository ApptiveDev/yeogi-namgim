import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  Camera,
  Map,
  Marker,
  UserLocation,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import { styles } from '../styles/home.styles';
import { localizedMapStyle } from '@/styles/map-style';
import type { MapBounds } from '@/api/types';
import { useNoteMarkers } from '@/hooks/use-note-markers';

export default function HomeScreen() {
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const { notes, error } = useNoteMarkers(bounds);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null =
      null;

    const startLocationTracking = async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

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
        () => {},
      );
    };

    startLocationTracking();

    return () => {
      subscription?.remove();
    };
  }, []);

  // 사용자가 지도를 직접 조작하면
  // 내 위치 고정을 해제
  const handleRegionWillChange = () => {
    setIsFollowingUser(false);
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

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={localizedMapStyle}
        logo={false}
        attribution={false}
        onRegionWillChange={handleRegionWillChange}
        onDidFinishLoadingMap={updateMapBounds}
        onRegionDidChange={updateMapBounds}
      >
        <Camera
          zoom={17.5}
          trackUserLocation={
            isFollowingUser
              ? 'default'
              : undefined
          }
        />

        <UserLocation animated />
        {notes.map((note) => (
          <Marker
            key={note.noteId}
            id={note.noteId}
            lngLat={[note.longitude, note.latitude]}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: note.isMine ? '#208AEF' : '#F97316',
                borderWidth: 2,
                borderColor: 'white',
              }}
            />
          </Marker>
        ))}
      </Map>

      <Pressable
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
      </Pressable>
    </View>
  );
}