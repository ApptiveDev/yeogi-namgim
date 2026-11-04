import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCodeInput } from '@/components/friends/FriendCodeInput';
import { BackButton } from '@/components/navigation/BackButton';
import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { createFriendInvitationFlow } from '@/state/friend-invitation';

import { friendActionStyles as action } from './friendActionStyles';

export type FriendAddMode = 'options' | 'create' | 'enter';

type Props = { onClose: (mode: FriendAddMode) => void; initialMode?: FriendAddMode };

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FriendAddDialog({ onClose, initialMode = 'options' }: Props) {
  const insets = useSafeAreaInsets();
  const [flow] = useState(createFriendInvitationFlow);
  const state = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const [mode, setMode] = useState(initialMode);
  const [now, setNow] = useState(Date.now);
  const [sharing, setSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const copyingRef = useRef(false);
  const sharingRef = useRef(false);
  const initialGenerationRef = useRef(false);
  const mountedRef = useRef(true);
  const busy = state.busy !== null || sharing || copying;
  const enteringCode = mode === 'enter';
  const createdExpired = !!state.created && Date.parse(state.created.expiresAt) <= now;

  useEffect(() => {
    mountedRef.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mountedRef.current = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (initialMode !== 'create' || initialGenerationRef.current) return;
    initialGenerationRef.current = true;
    void flow.generate();
  }, [flow, initialMode]);

  function closeDialog() {
    if (sharing) return;
    Keyboard.dismiss();
    onClose(mode);
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
      await Share.share({ title: '여기남김 친구 초대', message: `여기남김 친구 초대 코드: ${invitation.code}\n앱의 친구 화면에서 받은 코드를 입력해 주세요.\n만료: ${formatExpiry(invitation.expiresAt)} (한국 시간)` });
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
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDialog} disabled={sharing} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'} pointerEvents="box-none"
          style={[s.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[s.dialog, enteringCode && s.enterDialog]} accessibilityViewIsModal onAccessibilityEscape={closeDialog}>
            <View style={[s.header, enteringCode && s.enterHeader]}>
              {mode === 'create' ? (
                <View style={s.headerBack}>
                  <BackButton accessibilityLabel="친구 추가 방법 선택으로 돌아가기" disabled={busy} onPress={() => changeMode('options')} />
                </View>
              ) : null}
              <Text accessibilityRole="header" style={[s.title, enteringCode && s.enterTitle]}>{enteringCode ? '친구 코드 입력' : mode === 'create' ? '내 초대 코드' : '친구 추가'}</Text>
              {!enteringCode ? <Pressable onPress={closeDialog} disabled={sharing} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" accessibilityState={{ disabled: sharing }} style={s.close}>
                <ComposeIcon name="close" size={20} />
              </Pressable> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.content}>
              {mode === 'options' ? <>
                <Text style={s.description}>{'초대 코드를 보내거나 받은 코드를 입력해\n친구와 연결해 보세요.'}</Text>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[action.button, action.primary]}>
                  <Text style={action.label}>초대 링크 보내기</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => changeMode('enter')} style={[action.button, action.secondary]}>
                  <Text style={action.label}>코드로 추가하기</Text>
                </Pressable>
              </> : mode === 'create' ? <>
                <Text style={s.description}>{'친구에게 아래 코드를 보내 주세요.'}</Text>
                {state.created ? <Pressable accessibilityRole="button" accessibilityLabel="초대 코드 복사"
                  accessibilityHint="초대 코드를 클립보드에 복사합니다" accessibilityState={{ disabled: busy || createdExpired, busy: copying }}
                  disabled={busy || createdExpired} onPress={() => { void copyCode(); }} style={({ pressed }) => [s.codeCard, (pressed || copying) && s.disabled]}>
                  <Text style={s.code}>{state.created.code}</Text>
                  <Text style={s.notice}>{createdExpired ? '만료된 코드예요' : `${formatExpiry(state.created.expiresAt)}까지 · 한국 시간`}</Text>
                </Pressable> : null}
                <Pressable accessibilityRole="button" accessibilityLabel="초대 코드 공유" disabled={busy || !state.created || createdExpired}
                  accessibilityState={{ disabled: busy || !state.created || createdExpired }} onPress={() => { void shareCode(); }} style={[action.button, action.primary, (busy || !state.created || createdExpired) && s.disabled]}>
                  <Text style={action.label}>{sharing ? '공유 중…' : '코드 공유하기'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setActionError(null); setCopiedCode(null); void flow.generate(); }} style={[action.button, action.secondary, busy && s.disabled]}>
                  <Text style={action.label}>{state.created ? '새 코드 발급' : '코드 발급'}</Text>
                </Pressable>
                <Text accessibilityLiveRegion="polite" style={[s.notice, copiedCode === state.created?.code && s.copied]}>
                  {copying ? '코드 복사 중…' : copiedCode === state.created?.code ? '초대 코드를 복사했어요.' : '코드 영역을 누르면 바로 복사돼요.'}
                </Text>
              </> : <>
                <Text style={s.enterDescription}>{'친구에게 받은 6자리 코드가 있나요?\n지금 바로 연결해 드릴게요!'}</Text>
                <FriendCodeInput />
                {state.created && !createdExpired ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="내 코드 복사" disabled={busy}
                    accessibilityState={{ disabled: busy, busy: copying }} onPress={() => { void copyCode(); }} style={s.ownCode}>
                    <Text style={s.ownCodeLabel}>내 코드</Text>
                    <Text style={s.ownCodeValue}>{state.created.code}</Text>
                    <Text accessibilityLiveRegion="polite" style={s.ownCodeCopy}>{copiedCode === state.created.code ? '복사됨' : '복사'}</Text>
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setActionError(null); setCopiedCode(null); void flow.generate(); }}
                    style={[action.button, action.secondary, action.compact, s.generateInline, busy && s.disabled]}>
                    <Text style={[action.label, action.compactLabel]}>코드 생성하기</Text>
                  </Pressable>
                )}
                <View style={s.enterActions}>
                  <Pressable accessibilityRole="button" onPress={closeDialog} style={[action.button, s.enterButton, s.cancel]}>
                    <Text style={[action.label, s.cancelLabel]}>취소</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[action.button, action.primary, s.enterButton]}>
                    <Text style={action.label}>친구 추가</Text>
                  </Pressable>
                </View>
              </>}
              {state.busy ? <ActivityIndicator color={C.blue} style={s.status} accessibilityLabel="초대 코드 발급 중" /> : null}
              {state.error || actionError ? <Text accessibilityRole="alert" style={s.error}>{state.error || actionError}</Text> : null}
            </ScrollView>
            {enteringCode ? <Image
              source={require('../../../assets/images/my/smiley.png')}
              contentFit="contain"
              style={s.sticker}
              accessible={false}
              pointerEvents="none"
            /> : null}
          </View>
          {enteringCode ? <View style={s.enterOffset} pointerEvents="none" /> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  layout: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', maxWidth: 329, maxHeight: '100%', flexShrink: 1, borderRadius: 26, backgroundColor: C.background, overflow: 'hidden', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)' },
  enterDialog: { borderRadius: 28, backgroundColor: C.surface, overflow: 'visible' },
  enterOffset: { flexGrow: 1, flexBasis: 0, maxHeight: 48 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12 },
  headerBack: { marginRight: 12 },
  enterHeader: { minHeight: 0, paddingTop: 24, paddingBottom: 6, paddingRight: 24 },
  title: { flex: 1, fontFamily: F.bold, fontSize: 22, lineHeight: 32, color: C.ink, includeFontPadding: false },
  enterTitle: { fontSize: 20, lineHeight: 30 },
  sticker: { position: 'absolute', top: -18, right: -1, width: 52, height: 52, transform: [{ rotate: '12deg' }] },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  description: { fontFamily: F.regular, fontSize: 13, lineHeight: 23, color: C.muted, marginBottom: 8, includeFontPadding: false },
  enterDescription: { fontFamily: F.regular, fontSize: 13, lineHeight: 20, color: '#8E8E93', includeFontPadding: false, marginBottom: 4 },
  enterActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  enterButton: { flex: 1, paddingHorizontal: 8 },
  cancel: { minHeight: 52, alignSelf: 'center', borderRadius: 26, backgroundColor: '#F2F2F2' },
  cancelLabel: { fontSize: 15, color: '#5A5A5E' },
  generateInline: { alignSelf: 'center' },
  ownCode: { minHeight: 33, minWidth: 174, alignSelf: 'center', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: C.background },
  ownCodeLabel: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  ownCodeValue: { flexShrink: 1, fontFamily: F.bold, fontSize: 12, color: C.ink },
  ownCodeCopy: { minWidth: 40, lineHeight: 21, paddingHorizontal: 5, borderRadius: 11, overflow: 'hidden', backgroundColor: C.ink, color: C.surface, textAlign: 'center', fontFamily: F.bold, fontSize: 11 },
  codeCard: { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 18, gap: 10, alignItems: 'center' },
  code: { color: C.ink, fontSize: 20, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  notice: { fontFamily: F.regular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' },
  copied: { color: C.blue },
  error: { color: '#B42318', fontFamily: F.regular, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  status: { marginVertical: 4 },
  disabled: { opacity: 0.45 },
});
