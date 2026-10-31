import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Alert, useColorScheme } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { StartupScreen } from '@/components/StartupScreen';
import { getGuestToken } from '@/auth/guest-token';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 비회원 key 발급
  const started = useRef(false);
  const [authStatus, setAuthStatus] = useState<'loading'|'ready'|'error'>('loading');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function initializeGuest() {
      try {
        await getGuestToken();
        setAuthStatus('ready');
      } catch (error) {
        setAuthStatus('error');
        Alert.alert(error instanceof Error ? error.message : '비회원 토큰 발급 실패');
      }
    }
    initializeGuest();
  }, []);

  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {authStatus === 'ready' ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <StartupScreen
          message={authStatus === 'error'
            ? '서버와의 연결에 실패했습니다. 앱을 다시 실행해 주세요.'
            : undefined}
        />
      )}
    </ThemeProvider>
  );
}
