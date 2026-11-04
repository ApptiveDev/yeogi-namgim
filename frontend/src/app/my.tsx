import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MyComingSoonSections } from '@/components/my/MyComingSoonSections';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { MyHeader } from '@/components/my/MyHeader';
import { MyNoteStats } from '@/components/my/MyNoteStats';
import { MyProfile } from '@/components/my/MyProfile';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { MyColors as C } from '@/constants/my';
import { useMemberAccount } from '@/hooks/use-member-account';
import { memberToMyPage } from '@/utils/my-page';

export default function MyScreen() {
  const insets = useSafeAreaInsets();
  const account = useMemberAccount({ includeStats: true, keepPreviousData: true });
  const profile = account.profile.data ? memberToMyPage(account.profile.data, account.stats.data) : null;
  const loadingAccount = (account.profile.loading && !account.profile.data) || (account.stats.loading && !account.stats.data);
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
    'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
  });

  return (
    <View style={s.screen}>
      {(!fontsLoaded && !fontError) || loadingAccount ? (
        <View style={s.loading}><ActivityIndicator color={C.blue} accessibilityLabel="마이 페이지 준비 중" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}>
          <MyHeader />
          <AccountLoadState loading={false} error={account.profile.error} label="회원 프로필" onRetry={account.reload} />
          {profile ? <MyProfile profile={profile} /> : null}
          <MyNoteStats counts={{ found: null, written: account.stats.data?.writtenNoteCount ?? null, saved: account.stats.data?.savedNoteCount ?? null }} />
          <AccountLoadState loading={false} error={account.stats.error} label="활동 통계" onRetry={account.reload} />
          <Text style={s.notice}>{account.stats.data?.savedNoteCount != null ? '찾은 노트 집계를 준비하고 있어요.' : '찾은 노트와 저장한 노트 집계를 준비하고 있어요.'}</Text>
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
  notice: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
});
