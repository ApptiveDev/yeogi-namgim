import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Camera,
  Map,
  type StyleSpecification,
  UserLocation,
} from '@maplibre/maplibre-react-native';

import { styles } from '../styles/home.styles';

import mapStyle from '@/assets/maps/custom-style.json';

export default function HomeScreen() {
  const [isFollowingUser, setIsFollowingUser] =
    useState(true);

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

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={mapStyle as StyleSpecification}
        logo={false}
        attribution={false}
        onRegionWillChange={handleRegionWillChange}
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