import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, useColorScheme } from 'react-native';

import { Toast } from '@/components/ui/toast';
import { StartupScreen } from '@/components/StartupScreen';
import { initializeSession } from '@/auth/member-session';
import { ScreenColors, StorageColors } from '@/constants/colors';
import { useAuthSession } from '@/hooks/use-auth-session';
import { publishNoteDetailOpened } from '@/state/note-detail-transition';

SplashScreen.preventAutoHideAsync();

const TAB_SCREEN_OPTIONS = {
  animation: 'none',
  statusBarStyle: 'dark',
  // Keep the Android map surface attached behind the opaque tab screens.
  presentation: Platform.OS === 'android' ? 'transparentModal' : 'card',
} as const;

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
          <Stack.Screen name="note/[noteId]"
            options={{ presentation: 'transparentModal', animation: 'fade', statusBarStyle: 'light', contentStyle: { backgroundColor: 'transparent' } }}
            listeners={({ navigation }) => ({
              transitionEnd: ({ data }) => {
                if (!data.closing && navigation.isFocused()) publishNoteDetailOpened();
              },
            })} />
          <Stack.Screen name="storage" options={{ ...TAB_SCREEN_OPTIONS, contentStyle: { backgroundColor: StorageColors.background } }} />
          <Stack.Screen name="friends" options={{ ...TAB_SCREEN_OPTIONS, contentStyle: { backgroundColor: StorageColors.background } }} />
          <Stack.Screen name="my" options={{ ...TAB_SCREEN_OPTIONS, contentStyle: { backgroundColor: ScreenColors.background } }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="my-notes" />
        </Stack.Protected>
      </Stack>
      <Toast visible={!pathname.startsWith('/note/')} />
    </ThemeProvider>
  );
}
