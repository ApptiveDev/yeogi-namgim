import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Friend } from '@/api/friends';
import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { createFriendInvitationFlow } from '@/state/friend-invitation';

type Props = { onClose: () => void; onAccepted: (friend: Friend) => void; initialMode?: 'options' | 'enter' };

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FriendAddDialog({ onClose, onAccepted, initialMode = 'options' }: Props) {
  const insets = useSafeAreaInsets();
  const [flow] = useState(createFriendInvitationFlow);
  const state = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const [mode, setMode] = useState<'options' | 'create' | 'enter'>(initialMode);
  const [now, setNow] = useState(Date.now);
  const [sharing, setSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);
  const sharingRef = useRef(false);
  const notifiedRef = useRef(false);
  const mountedRef = useRef(true);
  const busy = state.busy !== null || sharing || copying;
  const cannotClose = state.busy === 'accept' || sharing;
  const createdExpired = !!state.created && Date.parse(state.created.expiresAt) <= now;
  const previewExpired = !!state.preview && Date.parse(state.preview.expiresAt) <= now;

  useEffect(() => {
    mountedRef.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (state.accepted && !notifiedRef.current) {
      notifiedRef.current = true;
      onAccepted(state.accepted);
    }
  }, [state.accepted, onAccepted]);

  function closeDialog() {
    if (cannotClose) return;
    Keyboard.dismiss();
    onClose();
  }

  function changeMode(next: typeof mode) {
    if (busy) return;
    Keyboard.dismiss();
    flow.clearPreview();
    setActionError(null);
    setCopiedCode(null);
    setMode(next);
  }

  async function copyCode() {
    const invitation = state.created;
    if (busy || copyingRef.current || sharingRef.current || !invitation) return;
    if (Date.parse(invitation.expiresAt) <= Date.now()) {
      setActionError('초대 코드가 만료됐어요. 새 코드를 발급해 주세요.');
      return;
    }
    copyingRef.current = true;
    setCopying(true);
    setCopiedCode(null);
    setActionError(null);
    try {
      const copied = await Clipboard.setStringAsync(invitation.code);
      if (!copied) throw new Error('Clipboard write failed');
      if (mountedRef.current) setCopiedCode(invitation.code);
    } catch {
      if (mountedRef.current) setActionError('코드를 복사하지 못했어요. 코드 영역을 다시 눌러 주세요.');
    } finally {
      copyingRef.current = false;
      if (mountedRef.current) setCopying(false);
    }
  }

  async function shareCode() {
    const invitation = state.created;
    if (busy || sharingRef.current || copyingRef.current || !invitation) return;
    if (Date.parse(invitation.expiresAt) <= Date.now()) {
      setActionError('초대 코드가 만료됐어요. 새 코드를 발급해 주세요.');
      return;
    }
    sharingRef.current = true;
    setSharing(true);
    setActionError(null);
    try {
      await Share.share({ title: '여기남김 친구 초대', message: `여기남김 친구 초대 코드: ${invitation.code}\n앱의 친구 → 추가 → 초대 코드 입력에서 확인해 주세요.\n만료: ${formatExpiry(invitation.expiresAt)} (한국 시간)` });
    } catch {
      if (mountedRef.current) setActionError('공유 창을 열지 못했어요. 위 코드 영역을 눌러 복사해 주세요.');
    } finally {
      sharingRef.current = false;
      if (mountedRef.current) setSharing(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDialog} disabled={cannotClose} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'} pointerEvents="box-none"
          style={[s.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.dialog} accessibilityViewIsModal onAccessibilityEscape={closeDialog}>
            <View style={s.header}>
              <Text accessibilityRole="header" style={s.title}>{mode === 'enter' ? '초대 코드 입력' : mode === 'create' ? '내 초대 코드' : '친구 추가'}</Text>
              <Pressable onPress={closeDialog} disabled={cannotClose} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" accessibilityState={{ disabled: cannotClose }} style={s.close}>
                <ComposeIcon name="close" size={20} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.content}>
              {mode === 'options' ? <>
                <Text style={s.description}>{'초대 코드를 보내거나 받은 코드를 입력해\n친구와 연결해 보세요.'}</Text>
                <Pressable accessibilityRole="button" onPress={() => { changeMode('create'); void flow.generate(); }} style={[s.button, s.primary]}>
                  <Text style={s.buttonLabel}>초대 코드 만들기</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => changeMode('enter')} style={[s.button, s.secondary]}>
                  <Text style={s.buttonLabel}>초대 코드 입력</Text>
                </Pressable>
              </> : mode === 'create' ? <>
                <Text style={s.description}>{'친구에게 아래 코드를 보내 주세요.\n한 코드로 한 명만 친구가 될 수 있어요.'}</Text>
                {state.created ? <Pressable accessibilityRole="button" accessibilityLabel="초대 코드 복사"
                  accessibilityHint="초대 코드를 클립보드에 복사합니다" accessibilityState={{ disabled: busy || createdExpired, busy: copying }}
                  disabled={busy || createdExpired} onPress={() => { void copyCode(); }} style={({ pressed }) => [s.codeCard, (pressed || copying) && s.disabled]}>
                  <Text style={s.code}>{state.created.code}</Text>
                  <Text style={s.notice}>{createdExpired ? '만료된 코드예요' : `${formatExpiry(state.created.expiresAt)}까지 · 한국 시간`}</Text>
                </Pressable> : null}
                <Pressable accessibilityRole="button" accessibilityLabel="초대 코드 공유" disabled={busy || !state.created || createdExpired}
                  accessibilityState={{ disabled: busy || !state.created || createdExpired }} onPress={() => { void shareCode(); }} style={[s.button, s.primary, (busy || !state.created || createdExpired) && s.disabled]}>
                  <Text style={s.buttonLabel}>{sharing ? '공유 중…' : '코드 공유하기'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setActionError(null); setCopiedCode(null); void flow.generate(); }} style={[s.button, s.secondary, busy && s.disabled]}>
                  <Text style={s.buttonLabel}>{state.created ? '새 코드 발급' : '코드 발급'}</Text>
                </Pressable>
                <Text accessibilityLiveRegion="polite" style={[s.notice, copiedCode === state.created?.code && s.copied]}>
                  {copying ? '코드 복사 중…' : copiedCode === state.created?.code ? '초대 코드를 복사했어요.' : '코드 영역을 누르면 바로 복사돼요.'}
                </Text>
              </> : <>
                <Text style={s.description}>친구에게 받은 16자리 코드를 입력해 주세요.</Text>
                <TextInput autoFocus value={state.input} onChangeText={flow.setInput} editable={!busy} accessibilityLabel="초대 코드 입력"
                  placeholder="초대 코드 16자리" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} spellCheck={false}
                  returnKeyType="done" onSubmitEditing={() => { Keyboard.dismiss(); void flow.preview(); }} style={s.input} />
                {state.preview ? <View style={s.preview}>
                  <Text style={s.inviter}>{state.preview.inviterNickname}님과 친구가 될까요?</Text>
                  <Text style={s.notice}>{previewExpired ? '코드가 만료됐어요. 새 코드를 받아 주세요.' : `${formatExpiry(state.preview.expiresAt)}까지 · 한국 시간`}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="친구 되기" disabled={busy || previewExpired}
                    accessibilityState={{ disabled: busy || previewExpired }} onPress={() => { Keyboard.dismiss(); void flow.accept(); }} style={[s.button, s.primary, (busy || previewExpired) && s.disabled]}>
                    <Text style={s.buttonLabel}>{state.busy === 'accept' ? '친구 추가 중…' : '친구 되기'}</Text>
                  </Pressable>
                </View> : <Pressable accessibilityRole="button" accessibilityLabel="초대 코드 확인" disabled={busy} onPress={() => { Keyboard.dismiss(); void flow.preview(); }} style={[s.button, s.primary, busy && s.disabled]}>
                  <Text style={s.buttonLabel}>코드 확인</Text>
                </Pressable>}
              </>}
              {state.busy ? <ActivityIndicator color={C.blue} style={s.status} accessibilityLabel={state.busy === 'create' ? '초대 코드 발급 중' : state.busy === 'preview' ? '초대 정보 확인 중' : '친구 추가 중'} /> : null}
              {state.error || actionError ? <Text accessibilityRole="alert" style={s.error}>{state.error || actionError}</Text> : null}
              {mode !== 'options' ? <Pressable disabled={busy} accessibilityRole="button" onPress={() => changeMode('options')} style={s.back}>
                <Text style={s.backLabel}>다른 방법으로 추가</Text>
              </Pressable> : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  layout: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dialog: { width: '100%', maxWidth: 400, maxHeight: '100%', flexShrink: 1, borderRadius: 26, backgroundColor: C.background, overflow: 'hidden', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)' },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12 },
  title: { flex: 1, fontFamily: F.bold, fontSize: 22, lineHeight: 32, color: C.ink, includeFontPadding: false },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  description: { fontFamily: F.regular, fontSize: 13, lineHeight: 23, color: C.muted, marginBottom: 8, includeFontPadding: false },
  button: { minHeight: 54, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.lime },
  secondary: { backgroundColor: C.surface },
  buttonLabel: { fontFamily: F.bold, fontSize: 14, lineHeight: 24, color: C.ink, textAlign: 'center', includeFontPadding: false },
  codeCard: { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 18, gap: 10, alignItems: 'center' },
  code: { color: C.ink, fontSize: 20, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  notice: { fontFamily: F.regular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' },
  copied: { color: C.blue },
  input: { minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E3E3DF', borderRadius: 16, backgroundColor: C.surface, fontFamily: F.regular, fontSize: 15, color: C.ink },
  preview: { gap: 12 },
  inviter: { fontFamily: F.bold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center' },
  error: { color: '#B42318', fontFamily: F.regular, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  status: { marginVertical: 4 },
  back: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  disabled: { opacity: 0.45 },
});
