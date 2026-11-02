import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { StartupScreen } from '@/components/StartupScreen';
import { initializeSession } from '@/auth/member-session';
import { useAuthSession } from '@/hooks/use-auth-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const auth = useAuthSession();
  const isLoggedIn = auth.status === 'authenticated';
  if (auth.status === 'loading' || auth.status === 'error') {
    return <StartupScreen message={auth.error ?? undefined}
      actionLabel={auth.status === 'error' ? '다시 시도' : undefined}
      onAction={() => { void initializeSession(true); }} />;
  }
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="storage" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="my" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
