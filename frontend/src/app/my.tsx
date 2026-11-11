import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountLoadState } from '@/components/my/AccountLoadState';
import { MyComingSoonSections } from '@/components/my/MyComingSoonSections';
import { MyHeader } from '@/components/my/MyHeader';
import { MyNoteStats } from '@/components/my/MyNoteStats';
import { MyProfile } from '@/components/my/MyProfile';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { FontFamilies } from '@/constants/fonts';
import { ScreenColors as C } from '@/constants/colors';
import { useMemberAccount } from '@/hooks/use-member-account';

const MY_FONTS = {
  [FontFamilies.archivoBlack]: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  [FontFamilies.notoSansKrRegular]: require('../../assets/fonts/NotoSansKR-Regular.otf'),
  [FontFamilies.notoSansKrMedium]: require('../../assets/fonts/NotoSansKR-Medium.otf'),
  [FontFamilies.notoSansKrBold]: require('../../assets/fonts/NotoSansKR-Bold.otf'),
};

function openCompose() {
  router.dismissTo({ pathname: '/', params: { compose: 'true' } });
}

export default function MyScreen() {
  const insets = useSafeAreaInsets();
  const { profile, stats, reload } = useMemberAccount({ includeStats: true, keepPreviousData: true });
  const [fontsLoaded, fontError] = useFonts(MY_FONTS);
  const preparing = (!fontsLoaded && !fontError)
    || (profile.loading && !profile.data)
    || (stats.loading && !stats.data);
  const displayName = profile.data?.nickname;
  const written = stats.data?.writtenNoteCount ?? null;
  const saved = stats.data?.savedNoteCount ?? null;
  const profileCard = displayName === undefined ? null : <MyProfile displayName={displayName} />;
  const noteStats = <MyNoteStats written={written} saved={saved} />;

  return (
    <View style={s.screen}>
      {preparing ? (
        <View style={s.loading}>
          <ActivityIndicator color={C.blue} accessibilityLabel="마이 페이지 준비 중" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}
        >
          <MyHeader />
          <AccountLoadState loading={false} error={profile.error} label="회원 프로필" onRetry={reload} />
          {profileCard}
          {noteStats}
          <AccountLoadState loading={false} error={stats.error} label="활동 통계" onRetry={reload} />
          <MyComingSoonSections />
        </ScrollView>
      )}
      <BottomTabBar selectedTab="my" onAddPress={openCompose} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
