import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Alert, useColorScheme } from 'react-native';
import { useEffect, useRef } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { getGuestToken } from '@/auth/guest-token';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  // 비회원 key 발급
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function initializeGuest() {
      try {
         await getGuestToken();
      } catch (error) {
        Alert.alert(error instanceof Error ? error.message : '비회원 토큰 발급 실패');
      }
    }
    initializeGuest();
  }, []);

  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
