import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountLoadState } from '@/components/my/AccountLoadState';
import { MyComingSoonSections } from '@/components/my/MyComingSoonSections';
import { MyHeader } from '@/components/my/MyHeader';
import { MyNoteStats, MyNoteStatsSkeleton } from '@/components/my/MyNoteStats';
import { MyProfile, MyProfileSkeleton } from '@/components/my/MyProfile';
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
  const { profile, stats, reload, reloadStats } = useMemberAccount({ includeStats: true });
  const [fontsLoaded, fontError] = useFonts(MY_FONTS);
  const preparing = !fontsLoaded && !fontError;
  const profileLoading = preparing || (profile.loading && !profile.data);
  const statsLoading = preparing || (stats.loading && !stats.data);
  const refreshing = !preparing && ((profile.data !== null && profile.loading) || (stats.data !== null && stats.loading));

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}
      >
        <MyHeader refreshing={refreshing} />
        {profileLoading ? <MyProfileSkeleton /> : (
          <>
            {profile.data ? <MyProfile displayName={profile.data.nickname} /> : null}
            <AccountLoadState loading={false} error={profile.error} label="회원 프로필" onRetry={reload} />
          </>
        )}
        {statsLoading ? <MyNoteStatsSkeleton /> : (
          <>
            {stats.data ? <MyNoteStats written={stats.data.writtenNoteCount} saved={stats.data.savedNoteCount} /> : null}
            <AccountLoadState loading={false} error={stats.error} label="활동 통계" onRetry={reloadStats} />
          </>
        )}
        <MyComingSoonSections />
      </ScrollView>
      <BottomTabBar selectedTab="my" onAddPress={openCompose} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
});
