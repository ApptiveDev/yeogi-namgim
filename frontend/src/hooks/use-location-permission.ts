import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { locationPermissionLabel } from '@/utils/location-permission';

type PermissionState = {
  permission: Location.LocationPermissionResponse | null;
  isBusy: boolean;
  error: string | null;
};

export function useLocationPermission() {
  const [state, setState] = useState<PermissionState>({ permission: null, isBusy: true, error: null });
  const controlRef = useRef({ mounted: false, busy: false, revision: 0 });

  const refresh = useCallback(() => {
    if (controlRef.current.busy) return;
    const revision = ++controlRef.current.revision;
    return Promise.resolve()
      .then(() => Location.getForegroundPermissionsAsync())
      .then((permission) => {
        if (controlRef.current.mounted && revision === controlRef.current.revision) {
          setState({ permission, isBusy: false, error: null });
        }
      })
      .catch(() => {
        if (controlRef.current.mounted && revision === controlRef.current.revision) {
          setState((current) => ({ ...current, isBusy: false, error: '위치 권한을 확인하지 못했어요. 다시 눌러 주세요.' }));
        }
      });
  }, []);

  useEffect(() => {
    const control = controlRef.current;
    control.mounted = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => {
      control.mounted = false;
      control.revision++;
      subscription.remove();
    };
  }, [refresh]);

  async function managePermission() {
    if (controlRef.current.busy) return;
    controlRef.current.busy = true;
    const revision = ++controlRef.current.revision;
    setState((current) => ({ ...current, isBusy: true, error: null }));
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (!controlRef.current.mounted || revision !== controlRef.current.revision) return;

      if (current.granted || !current.canAskAgain) {
        setState({ permission: current, isBusy: true, error: null });
        if (Platform.OS === 'web') {
          Alert.alert('위치 권한', '브라우저의 사이트 설정에서 위치 권한을 변경해 주세요.');
        } else {
          await Linking.openSettings();
        }
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (controlRef.current.mounted && revision === controlRef.current.revision) {
          setState({ permission, isBusy: false, error: null });
        }
      }
    } catch {
      if (controlRef.current.mounted && revision === controlRef.current.revision) {
        setState((current) => ({ ...current, error: '위치 권한 설정을 열지 못했어요. 다시 시도해 주세요.' }));
      }
    } finally {
      controlRef.current.busy = false;
      if (controlRef.current.mounted && revision === controlRef.current.revision) {
        setState((current) => ({ ...current, isBusy: false }));
      }
    }
  }

  return {
    ...state,
    label: !state.permission && state.error ? '확인 필요' : locationPermissionLabel(state.permission),
    managePermission,
  };
}
