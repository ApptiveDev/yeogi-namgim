import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MyComingSoonSections } from '@/components/my/MyComingSoonSections';
import { MyHeader } from '@/components/my/MyHeader';
import { MyNoteStats } from '@/components/my/MyNoteStats';
import { MyProfile } from '@/components/my/MyProfile';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { MyColors as C } from '@/constants/my';
import { MY_PAGE_RESPONSE } from '@/data/my-page';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { resolveMyPageData } from '@/utils/my-page';

export default function MyScreen() {
  const insets = useSafeAreaInsets();
  const { mockDataEnabled, isReady } = useDeveloperSettings();
  const profile = resolveMyPageData(MY_PAGE_RESPONSE, mockDataEnabled);
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
    'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
  });

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ animation: 'none', statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      {(!fontsLoaded && !fontError) || !isReady ? (
        <View style={s.loading}><ActivityIndicator color={C.blue} accessibilityLabel="마이 페이지 준비 중" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}>
          <MyHeader />
          <MyProfile profile={profile} />
          <MyNoteStats counts={profile.noteCounts} />
          <MyComingSoonSections />
        </ScrollView>
      )}
      <BottomTabBar selectedTab="my" onAddPress={() => router.dismissTo({ pathname: '/', params: { compose: 'true' } })} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
