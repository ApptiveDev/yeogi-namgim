import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { Toast } from '@/components/ui/toast';
import { StartupScreen } from '@/components/StartupScreen';
import { initializeSession } from '@/auth/member-session';
import { MyColors } from '@/constants/my';
import { StorageColors } from '@/constants/storage';
import { useAuthSession } from '@/hooks/use-auth-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
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
          <Stack.Screen name="note/[noteId]" options={{ presentation: 'transparentModal', animation: 'fade', statusBarStyle: 'light', contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="storage" />
          <Stack.Screen name="friends" options={{ animation: 'none', statusBarStyle: 'dark', contentStyle: { backgroundColor: StorageColors.background } }} />
          <Stack.Screen name="my" options={{ animation: 'none', statusBarStyle: 'dark', contentStyle: { backgroundColor: MyColors.background } }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="my-notes" />
        </Stack.Protected>
      </Stack>
      <Toast visible={!pathname.startsWith('/note/')} />
    </ThemeProvider>
  );
}
