import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { locationPermissionLabel } from '@/utils/location-permission';

type PermissionState = {
  permissionLabel: string | null;
  isBusy: boolean;
  error: string | null;
};

export function useLocationPermission() {
  const [state, setState] = useState<PermissionState>({ permissionLabel: null, isBusy: true, error: null });
  const controlRef = useRef({ focused: false, managing: false, refreshPending: false, revision: 0 });

  const updatePermission = useCallback((permission: Location.LocationPermissionResponse, isBusy: boolean) => {
    const permissionLabel = locationPermissionLabel(permission);
    setState((current) => current.permissionLabel === permissionLabel && current.isBusy === isBusy && current.error === null
      ? current
      : { permissionLabel, isBusy, error: null });
  }, []);

  const refresh = useCallback(async () => {
    const control = controlRef.current;
    if (!control.focused) return;
    if (control.managing) {
      control.refreshPending = true;
      return;
    }

    const revision = ++control.revision;
    const isCurrent = () => control.focused && revision === control.revision;
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (isCurrent()) updatePermission(permission, false);
    } catch {
      if (isCurrent()) {
        setState((current) => ({ ...current, isBusy: false, error: '위치 권한을 확인하지 못했어요. 다시 눌러 주세요.' }));
      }
    }
  }, [updatePermission]);

  useFocusEffect(useCallback(() => {
    const control = controlRef.current;
    control.focused = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => {
      control.focused = false;
      control.refreshPending = false;
      control.revision++;
      subscription.remove();
    };
  }, [refresh]));

  async function managePermission() {
    const control = controlRef.current;
    if (!control.focused || control.managing) return;
    control.managing = true;
    const revision = ++control.revision;
    const isCurrent = () => control.focused && revision === control.revision;
    setState((current) => ({ ...current, isBusy: true, error: null }));
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (!isCurrent()) return;

      if (current.granted || !current.canAskAgain) {
        updatePermission(current, true);
        if (Platform.OS === 'web') {
          Alert.alert('위치 권한', '브라우저의 사이트 설정에서 위치 권한을 변경해 주세요.');
        } else {
          await Linking.openSettings();
        }
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (isCurrent()) updatePermission(permission, false);
      }
    } catch {
      if (isCurrent()) {
        setState((current) => ({ ...current, error: '위치 권한 설정을 열지 못했어요. 다시 시도해 주세요.' }));
      }
    } finally {
      control.managing = false;
      if (isCurrent()) {
        setState((current) => current.isBusy ? { ...current, isBusy: false } : current);
      }
      if (control.refreshPending) {
        control.refreshPending = false;
        void refresh();
      }
    }
  }

  return {
    isBusy: state.isBusy,
    error: state.error,
    label: state.permissionLabel ?? (state.error ? '확인 필요' : locationPermissionLabel(null)),
    managePermission,
  };
}
