import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateMemberProfile } from '@/api/auth';
import { runMemberRequest } from '@/auth/member-session';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { MyColors as C } from '@/constants/my';
import { useMemberAccount } from '@/hooks/use-member-account';
import { validateNickname } from '@/utils/auth-validation';

function closeEditor() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

function NicknameForm({ initialNickname }: { initialNickname: string }) {
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function save() {
    if (saving.current) return;
    const validation = validateNickname(nickname);
    if (validation) { setError(validation); return; }
    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await runMemberRequest((token) => updateMemberProfile(nickname, token));
      if (mounted.current) closeEditor();
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : '닉네임을 저장하지 못했어요.');
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }

  return (
    <View style={s.form}>
      <Stack.Screen options={{ gestureEnabled: !isSaving }} />
      <Text style={s.label}>닉네임</Text>
      <TextInput accessibilityLabel="닉네임" value={nickname} onChangeText={(value) => { setNickname(value); setError(null); }}
        editable={!isSaving} autoCapitalize="none" autoCorrect={false} returnKeyType="done"
        onSubmitEditing={() => { void save(); }} style={s.input} />
      <Text style={s.description}>앞뒤 공백을 제외하고 2~20자로 입력해 주세요.</Text>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="닉네임 저장" accessibilityState={{ disabled: isSaving, busy: isSaving }}
        disabled={isSaving} onPress={() => { void save(); }} style={[s.button, isSaving && s.disabled]}>
        <Text style={s.buttonText}>{isSaving ? '저장 중…' : '저장'}</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const account = useMemberAccount();
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="설정으로 돌아가기" onPress={closeEditor} style={s.back}>
          <Text style={s.backText}>〈 뒤로</Text>
        </Pressable>
        <Text accessibilityRole="header" style={s.title}>닉네임 편집</Text>
        <AccountLoadState {...account.profile} label="회원 프로필" onRetry={account.reload} />
        {account.profile.data ? <NicknameForm key={account.profile.owner} initialNickname={account.profile.data.nickname} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 16 },
  backText: { color: C.ink, fontSize: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: C.ink, marginVertical: 16 },
  form: { gap: 12 },
  label: { color: C.ink, fontSize: 15, fontWeight: 'bold' },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.muted, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 16, fontSize: 17, color: C.ink },
  description: { color: C.muted, fontSize: 13, lineHeight: 20 },
  error: { color: '#B42318', fontSize: 13, lineHeight: 20 },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  buttonText: { color: C.surface, fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
});
