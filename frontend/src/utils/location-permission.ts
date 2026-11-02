import type { LocationPermissionResponse } from 'expo-location';

export function locationPermissionLabel(permission: LocationPermissionResponse | null) {
  if (!permission) return '확인 중';
  if (permission.status === 'undetermined') return '설정 전';
  if (!permission.granted) return '허용 안 함';
  if (permission.ios?.scope === 'always') return '항상 허용';
  if (permission.ios?.scope === 'whenInUse') return '사용 중 허용';
  if (permission.android?.accuracy === 'coarse') return '대략적 허용';
  return '허용됨';
}
