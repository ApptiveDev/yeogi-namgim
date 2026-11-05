import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MemberProfile } from '@/api/auth';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { BackButton } from '@/components/navigation/BackButton';
import { ProfileVisibilityPicker } from '@/components/settings/ProfileVisibilityPicker';
import { FontFamilies } from '@/constants/fonts';
import { SettingsColors as C, StorageColors } from '@/constants/colors';
import { useMemberAccount } from '@/hooks/use-member-account';
import { saveMemberNickname } from '@/state/member-account';
import { validateNickname } from '@/utils/auth-validation';

const PROFILE_FONTS = {
  [FontFamilies.notoSansKrRegular]: require('../../assets/fonts/NotoSansKR-Regular.otf'),
  [FontFamilies.notoSansKrMedium]: require('../../assets/fonts/NotoSansKR-Medium.otf'),
  [FontFamilies.notoSansKrBold]: require('../../assets/fonts/NotoSansKR-Bold.otf'),
  [FontFamilies.interRegular]: require('../../assets/fonts/Inter-Regular.otf'),
};
const EDITOR_SCREEN_OPTIONS = {
  headerShown: false,
  statusBarStyle: 'dark',
  contentStyle: { backgroundColor: C.background },
} as const;
const EDITOR_GESTURES = {
  idle: { gestureEnabled: true },
  saving: { gestureEnabled: false },
};
const NICKNAME_LIMIT = 12;
const BIO_LIMIT = 40;
const INPUT_APPEARANCE = Platform.select({
  android: {
    cursorColor: StorageColors.blue,
    selectionColor: '#DBE4FF',
    underlineColorAndroid: 'transparent',
  },
  ios: { selectionColor: StorageColors.blue },
});

function closeEditor() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

function ProfilePhoto() {
  return (
    <View style={s.photo}>
      <View>
        <View style={s.avatarFrame}>
          <Image source={require('../../assets/images/settings-profile-avatar.svg')} style={s.avatar} contentFit="cover" accessible={false} />
        </View>
        <View pointerEvents="none" style={s.cameraBadge}>
          <Image source={require('../../assets/images/profile-edit-camera.svg')} style={s.cameraIcon} contentFit="contain" accessible={false} />
        </View>
      </View>
      <View accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="사진 변경, 준비 중" style={s.photoButton}>
        <Text style={s.photoButtonText}>사진 변경</Text>
      </View>
    </View>
  );
}

function HandlePreviewField({ disabled }: { disabled: boolean }) {
  const [handle, setHandle] = useState('');

  return (
    <View style={s.field}>
      <Text style={s.label}>아이디</Text>
      <View style={[s.fieldBox, s.handleBox]}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={s.handlePrefix}>@</Text>
        <TextInput
          {...INPUT_APPEARANCE}
          accessibilityLabel="아이디"
          accessibilityHint="아이디 저장은 준비 중입니다"
          value={handle}
          onChangeText={setHandle}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={s.input}
        />
      </View>
    </View>
  );
}

function BioPreviewField({ disabled }: { disabled: boolean }) {
  const [bio, setBio] = useState('');

  return (
    <View style={s.field}>
      <Text style={s.label}>한 줄 소개</Text>
      <View style={[s.fieldBox, s.bioBox]}>
        <View style={s.bioEntry}>
          {bio === '' ? (
            <Text aria-hidden numberOfLines={2} style={s.bioPlaceholder}>한 줄 소개를 입력해 주세요</Text>
          ) : null}
          <TextInput
            {...INPUT_APPEARANCE}
            accessibilityLabel="한 줄 소개 미리보기"
            value={bio}
            onChangeText={setBio}
            editable={!disabled}
            maxLength={BIO_LIMIT}
            multiline
            numberOfLines={2}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            style={[s.input, s.bioInput]}
          />
        </View>
        <Text style={[s.counter, s.bioCounter]}>{bio.length}/{BIO_LIMIT}</Text>
      </View>
    </View>
  );
}

function ProfileForm({ profile }: { profile: MemberProfile }) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  // Match the native maxLength unit, including for characters such as emoji.
  const nicknameLength = Array.from(nickname).length;
  // Existing longer nicknames can be shortened without truncating them on load.
  const nicknameInputLimit = Math.max(NICKNAME_LIMIT, nicknameLength);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function changeNickname(value: string) {
    setNickname(value);
    setError(null);
  }

  function save() {
    if (saving.current) return;
    const validation = nicknameLength > NICKNAME_LIMIT
      ? `닉네임은 ${NICKNAME_LIMIT}자까지 입력할 수 있어요.`
      : validateNickname(nickname, NICKNAME_LIMIT);
    if (validation) { setError(validation); return; }
    saving.current = true;
    setIsSaving(true);
    setError(null);
    Keyboard.dismiss();
    void saveMemberNickname(nickname)
      .then(() => { if (mounted.current) closeEditor(); })
      .catch((failure: unknown) => {
        if (mounted.current) setError(failure instanceof Error ? failure.message : '닉네임을 저장하지 못했어요.');
      })
      .finally(() => {
        saving.current = false;
        if (mounted.current) setIsSaving(false);
      });
  }

  return (
    <View style={s.form}>
      <Stack.Screen options={isSaving ? EDITOR_GESTURES.saving : EDITOR_GESTURES.idle} />
      <ProfilePhoto />

      <View style={s.field}>
        <Text style={s.label}>닉네임</Text>
        <View style={s.fieldBox}>
          <TextInput
            {...INPUT_APPEARANCE}
            accessibilityLabel="닉네임 변경"
            value={nickname}
            onChangeText={changeNickname}
            editable={!isSaving}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={nicknameInputLimit}
            onSubmitEditing={save}
            style={[s.input, s.nickname]}
          />
          <Text style={[s.counter, nicknameLength > NICKNAME_LIMIT && s.error]}>{nicknameLength}/{NICKNAME_LIMIT}</Text>
        </View>
      </View>

      <HandlePreviewField disabled={isSaving} />
      <BioPreviewField disabled={isSaving} />

      <View style={s.field}>
        <Text style={s.label}>공개 범위</Text>
        <ProfileVisibilityPicker disabled={isSaving} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>이메일</Text>
        <View style={s.fieldBox}>
          <Text selectable numberOfLines={1} accessibilityLabel={`${profile.email}, 읽기 전용`} style={s.email}>{profile.email}</Text>
        </View>
      </View>

      <View style={s.footer}>
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSaving, busy: isSaving }}
          disabled={isSaving} onPress={save} style={({ pressed }) => [s.button, (pressed || isSaving) && s.dimmed]}>
          <Text style={s.buttonText}>{isSaving ? '저장 중…' : '저장하기'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { profile, reload } = useMemberAccount();
  const [fontsLoaded, fontError] = useFonts(PROFILE_FONTS);
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={EDITOR_SCREEN_OPTIONS} />
      <View style={[s.container, s.header, { paddingTop: insets.top + 10 }]}>
        <BackButton accessibilityLabel="설정으로 돌아가기" onPress={closeEditor} />
        <Text accessibilityRole="header" style={[s.title, !fontsLoaded && s.fallbackTitle]}>프로필 편집</Text>
      </View>
      {fontsLoaded || fontError ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.container, s.content, { paddingBottom: insets.bottom + 24 }]}>
          <AccountLoadState loading={profile.loading} error={profile.error} label="회원 프로필" onRetry={reload} />
          {profile.data ? <ProfileForm key={profile.owner} profile={profile.data} /> : null}
        </ScrollView>
      ) : (
        <ActivityIndicator style={s.loading} color={C.ink} accessibilityLabel="프로필 편집 화면 준비 중" />
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  container: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
  title: { flex: 1, marginRight: 44, textAlign: 'center', fontFamily: FontFamilies.notoSansKrBold, fontSize: 18, lineHeight: 26, color: C.ink, includeFontPadding: false },
  fallbackTitle: { fontFamily: undefined, fontWeight: 'bold' },
  content: { flexGrow: 1, paddingTop: 12 },
  loading: { marginTop: 12 },
  form: { flexGrow: 1, gap: 12 },
  photo: { alignItems: 'center', gap: 6, marginBottom: 2 },
  avatarFrame: { borderWidth: 4, borderColor: C.surface, borderRadius: 46, backgroundColor: C.surface, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.12)' },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: C.surface, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { width: 20, height: 20 },
  photoButton: { minHeight: 32, justifyContent: 'center' },
  photoButtonText: { color: C.blue, fontFamily: FontFamilies.notoSansKrBold, fontSize: 13, lineHeight: 20, includeFontPadding: false },
  field: { gap: 6 },
  label: { color: C.section, fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, fontWeight: 700, includeFontPadding: false, marginLeft: 8 },
  fieldBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 16, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
  handleBox: { gap: 0 },
  handlePrefix: { color: C.ink, fontFamily: FontFamilies.interRegular, fontSize: 15, includeFontPadding: false },
  bioBox: { height: 72, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingTop: 8, paddingBottom: 8 },
  input: {
    flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 0, paddingVertical: 0,
    fontFamily: FontFamilies.notoSansKrRegular, fontSize: 15, color: C.ink, textAlignVertical: 'center', includeFontPadding: false,
    ...Platform.select({ web: { caretColor: StorageColors.blue } }),
  },
  nickname: { fontFamily: FontFamilies.notoSansKrBold },
  bioEntry: { height: 40 },
  bioInput: { fontSize: 14, lineHeight: 20, textAlign: 'left', textAlignVertical: 'top' },
  bioPlaceholder: {
    position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none',
    fontFamily: FontFamilies.notoSansKrRegular, fontSize: 14, lineHeight: 20, textAlign: 'left', includeFontPadding: false, color: '#8E8E93',
  },
  counter: { color: C.section, fontFamily: FontFamilies.interRegular, fontSize: 12, lineHeight: 18, fontWeight:500 },
  bioCounter: { alignSelf: 'flex-end', marginTop: 'auto', lineHeight: 14, includeFontPadding: false },
  email: { flex: 1, fontFamily: FontFamilies.notoSansKrRegular, fontSize: 15, lineHeight: 22, color: C.ink },
  description: { color: '#626267', fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, lineHeight: 18 },
  footer: { marginTop: 'auto', paddingTop: 8, gap: 8 },
  error: { color: '#B42318', fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 52, borderRadius: 999, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  buttonText: { color: C.ink, fontFamily: FontFamilies.notoSansKrBold, fontSize: 16, lineHeight: 24, includeFontPadding: false },
  dimmed: { opacity: 0.6 },
});
