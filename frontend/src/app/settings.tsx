import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appConfig from '../../app.json';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { BackButton } from '@/components/navigation/BackButton';
import { SettingsNotifications } from '@/components/settings/SettingsNotifications';
import { SettingsProfile, SettingsProfilePlaceholder } from '@/components/settings/SettingsProfile';
import { SettingsBadge, SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsSignOutRow } from '@/components/settings/SettingsSignOutRow';
import { SettingsSwitch } from '@/components/settings/SettingsSwitch';
import { FontFamilies } from '@/constants/fonts';
import { SettingsColors as C } from '@/constants/settings';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useLocationPermission } from '@/hooks/use-location-permission';
import { useMemberAccount } from '@/hooks/use-member-account';

const SETTINGS_FONTS = {
  [FontFamilies.archivoBlack]: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  [FontFamilies.notoSansKrRegular]: require('../../assets/fonts/NotoSansKR-Regular.otf'),
  [FontFamilies.notoSansKrMedium]: require('../../assets/fonts/NotoSansKR-Medium.otf'),
  [FontFamilies.notoSansKrBold]: require('../../assets/fonts/NotoSansKR-Bold.otf'),
};

const SCREEN_OPTIONS = { statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } } as const;
const MOCK_DATA_LABEL = '목업 데이터 사용';

function showComingSoon(label: string) {
  Alert.alert(label, '준비 중인 기능이에요.');
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/my');
}

function editProfile() {
  router.push('/profile-edit');
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const developer = useDeveloperSettings();
  const location = useLocationPermission();
  const { profile, reload } = useMemberAccount();
  const [fontsLoaded, fontError] = useFonts(SETTINGS_FONTS);
  const preparing = (!fontsLoaded && !fontError) || !developer.isReady;

  return (
    <View style={s.screen}>
      <Stack.Screen options={SCREEN_OPTIONS} />
      {preparing ? (
        <View style={s.loading}>
          <ActivityIndicator color={C.section} accessibilityLabel="설정 화면 준비 중" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
        >
          <BackButton accessibilityLabel="마이페이지로 돌아가기" onPress={goBack} />
          <Text accessibilityRole="header" accessibilityLabel="설정" style={s.title}>SETTINGS</Text>
          {profile.data ? (
            <SettingsProfile nickname={profile.data.nickname} email={profile.data.email} onEdit={editProfile} />
          ) : profile.loading ? (
            <SettingsProfilePlaceholder />
          ) : (
            <AccountLoadState loading={profile.loading} error={profile.error} label="회원 프로필" onRetry={reload} />
          )}

          <SettingsNotifications />

          <SettingsSection title="위치">
            <SettingsRow
              label="위치 권한"
              trailing={<SettingsBadge label={location.label} />}
              disabled={location.isBusy}
              accessibilityLabel={`위치 권한, ${location.label}`}
              accessibilityHint="위치 권한을 요청하거나 기기 설정을 엽니다"
              onPress={location.managePermission}
            />
            <SettingsRow
              label="쪽지 알림 반경"
              trailing={<SettingsBadge label="200m" />}
              onPress={() => showComingSoon('쪽지 알림 반경')}
            />
          </SettingsSection>

          {location.error ? <Text accessibilityRole="alert" style={s.error}>{location.error}</Text> : null}

          <SettingsSection title="계정">
            <SettingsRow
              label="카카오 계정"
              trailing={<SettingsBadge label="연결 준비" tone="kakao" />}
              onPress={() => showComingSoon('카카오 계정')}
            />
            <SettingsRow label="차단 목록" onPress={() => showComingSoon('차단 목록')} />
            <SettingsSignOutRow />
          </SettingsSection>

          <SettingsSection title="정보">
            <SettingsRow label="이용약관" onPress={() => showComingSoon('이용약관')} />
            <SettingsRow label="개인정보 처리방침" onPress={() => showComingSoon('개인정보 처리방침')} />
          </SettingsSection>

          <SettingsSection title="개발자 도구">
            <SettingsRow
              label={MOCK_DATA_LABEL}
              description="보관함과 친구 화면에 예시 데이터를 표시해요"
              trailing={(
                <SettingsSwitch
                  label={MOCK_DATA_LABEL}
                  value={developer.mockDataEnabled}
                  disabled={developer.isSaving}
                  onValueChange={developer.setMockDataEnabled}
                />
              )}
            />
          </SettingsSection>
          {developer.error ? <Text accessibilityRole="alert" style={s.error}>{developer.error}</Text> : null}

          <View style={s.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="회원 탈퇴"
              accessibilityHint="준비 중 안내를 확인합니다"
              onPress={() => showComingSoon('회원 탈퇴')}
              style={({ pressed }) => [s.withdraw, pressed && s.pressed]}
            >
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
  title: { marginTop: 12, color: C.ink, fontFamily: FontFamilies.archivoBlack, fontSize: 30, lineHeight: 38, includeFontPadding: false },
  error: { marginTop: 8, marginHorizontal: 8, fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 17, color: C.destructive },
  footer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdraw: { minHeight: 44, justifyContent: 'center' },
  withdrawText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 12, lineHeight: 18, color: C.destructive, textDecorationLine: 'underline', includeFontPadding: false },
  version: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
});
