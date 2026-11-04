import { useState } from 'react';
import { Alert } from 'react-native';

import { authErrorMessage } from '@/api/auth';
import { signOut } from '@/auth/member-session';

import { SettingsRow } from './SettingsRow';

export function SettingsSignOutRow() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    void signOut()
      .catch((error: unknown) => { Alert.alert('로그아웃 실패', authErrorMessage(error)); })
      .finally(() => { setIsSigningOut(false); });
  }

  return (
    <SettingsRow
      label={isSigningOut ? '로그아웃 중…' : '로그아웃'}
      disabled={isSigningOut}
      accessibilityHint="현재 계정에서 로그아웃합니다"
      onPress={handleSignOut}
    />
  );
}
