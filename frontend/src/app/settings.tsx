import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appConfig from '../../app.json';
import { signOut } from '@/auth/member-session';
import { authErrorMessage } from '@/api/auth';
import { BackButton } from '@/components/navigation/BackButton';
import { SettingsBadge, SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsProfile, SettingsProfilePlaceholder } from '@/components/settings/SettingsProfile';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsSwitch } from '@/components/settings/SettingsSwitch';
import { SettingsColors as C, SettingsFonts as F } from '@/constants/settings';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useLocationPermission } from '@/hooks/use-location-permission';
import { useMemberAccount } from '@/hooks/use-member-account';
import { memberToMyPage } from '@/utils/my-page';

function showComingSoon(label: string) {
  Alert.alert(label, '준비 중인 기능이에요.');
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/my');
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const developer = useDeveloperSettings();
  const location = useLocationPermission();
  const account = useMemberAccount();
  const profile = account.profile.data;
  const [notifications, setNotifications] = useState({ nearby: true, friends: true, marketing: false });
  const [isSigningOut, setIsSigningOut] = useState(false);
  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try { await signOut(); }
    catch (error) { Alert.alert('로그아웃 실패', authErrorMessage(error)); }
    finally { setIsSigningOut(false); }
  }
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
    'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
  });

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      {(!fontsLoaded && !fontError) || !developer.isReady ? (
        <View style={s.loading}><ActivityIndicator color={C.section} accessibilityLabel="설정 화면 준비 중" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}>
          <BackButton accessibilityLabel="마이페이지로 돌아가기" onPress={goBack} />
          <Text accessibilityRole="header" accessibilityLabel="설정" style={s.title}>SETTINGS</Text>
          {profile ? (
            <SettingsProfile profile={memberToMyPage(profile)} email={profile.email} onEdit={() => router.push('/profile-edit')} />
          ) : account.profile.loading ? (
            <SettingsProfilePlaceholder />
          ) : (
            <AccountLoadState {...account.profile} label="회원 프로필" onRetry={account.reload} />
          )}

          <SettingsSection title="알림">
            <SettingsRow label="근처 쪽지 알림" description="반경 200m 안에 쪽지가 생기면 알려줘요" trailing={<SettingsSwitch label="근처 쪽지 알림" value={notifications.nearby} onValueChange={(nearby) => setNotifications((current) => ({ ...current, nearby }))} />} />
            <SettingsRow label="친구 쪽지 알림" description="친구가 새 쪽지를 남기면 알려줘요" trailing={<SettingsSwitch label="친구 쪽지 알림" value={notifications.friends} onValueChange={(friends) => setNotifications((current) => ({ ...current, friends }))} />} />
            <SettingsRow label="마케팅 정보 수신" trailing={<SettingsSwitch label="마케팅 정보 수신" value={notifications.marketing} onValueChange={(marketing) => setNotifications((current) => ({ ...current, marketing }))} />} />
          </SettingsSection>

          <SettingsSection title="위치">
            <SettingsRow label="위치 권한" trailing={<SettingsBadge label={location.label} />} disabled={location.isBusy} accessibilityLabel={`위치 권한, ${location.label}`} accessibilityHint="위치 권한을 요청하거나 기기 설정을 엽니다" onPress={() => { void location.managePermission(); }} />
            <SettingsRow label="쪽지 알림 반경" trailing={<SettingsBadge label="200m" />} onPress={() => showComingSoon('쪽지 알림 반경')} />
          </SettingsSection>

          {location.error ? <Text accessibilityRole="alert" style={s.error}>{location.error}</Text> : null}

          <SettingsSection title="계정">
            <SettingsRow label="카카오 계정" trailing={<SettingsBadge label="연결 준비" tone="kakao" />} onPress={() => showComingSoon('카카오 계정')} />
            <SettingsRow label="차단 목록" onPress={() => showComingSoon('차단 목록')} />
            <SettingsRow label={isSigningOut ? '로그아웃 중…' : '로그아웃'} disabled={isSigningOut}
              accessibilityHint="현재 계정에서 로그아웃합니다" onPress={() => { void handleSignOut(); }} />
          </SettingsSection>

          <SettingsSection title="정보">
            <SettingsRow label="이용약관" onPress={() => showComingSoon('이용약관')} />
            <SettingsRow label="개인정보 처리방침" onPress={() => showComingSoon('개인정보 처리방침')} />
          </SettingsSection>

          <SettingsSection title="개발자 도구">
            <SettingsRow
              label="목업 데이터 사용"
              description="보관함과 친구 화면에 예시 데이터를 표시해요"
              trailing={<SettingsSwitch label="목업 데이터 사용" value={developer.mockDataEnabled} disabled={!developer.isReady || developer.isSaving} onValueChange={(enabled) => { void developer.setMockDataEnabled(enabled); }} />}
            />
          </SettingsSection>
          {developer.error ? <Text accessibilityRole="alert" style={s.error}>{developer.error}</Text> : null}

          <View style={s.footer}>
            <Pressable accessibilityRole="button" accessibilityLabel="회원 탈퇴" accessibilityHint="준비 중 안내를 확인합니다" onPress={() => showComingSoon('회원 탈퇴')} style={({ pressed }) => [s.withdraw, pressed && s.pressed]}>
              <Text style={s.withdrawText}>회원 탈퇴</Text>
            </Pressable>
            <Text style={s.version}>·  v{appConfig.expo.version}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  title: { marginTop: 12, color: C.ink, fontFamily: F.display, fontSize: 30, lineHeight: 38, includeFontPadding: false },
  error: { marginTop: 8, marginHorizontal: 8, fontFamily: F.regular, fontSize: 11, lineHeight: 17, color: C.destructive },
  footer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdraw: { minHeight: 44, justifyContent: 'center' },
  withdrawText: { fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.destructive, textDecorationLine: 'underline', includeFontPadding: false },
  version: { fontFamily: F.regular, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
});
