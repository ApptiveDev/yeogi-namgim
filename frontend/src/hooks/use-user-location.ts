import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useUserLocation() {
  const [userCoordinates, setUserCoordinates] =
    useState<Location.LocationObjectCoords | null>(null);

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

  return { userCoordinates, setUserCoordinates };
}
