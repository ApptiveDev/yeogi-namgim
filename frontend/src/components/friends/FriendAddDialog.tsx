import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FriendInvitation } from '@/api/friends';
import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/storage';
import { createFriendInvitationFlow } from '@/state/friend-invitation';

import { FriendCodeInput } from './FriendCodeInput';
import { friendActionStyles as action } from './friendActionStyles';

export type FriendAddMode = 'options' | 'create' | 'enter';

type Props = { onClose: (mode: FriendAddMode) => void; initialMode?: FriendAddMode };
type CodeAction = 'copy' | 'share';

const TITLES: Record<FriendAddMode, string> = {
  options: '친구 추가',
  create: '내 초대 코드',
  enter: '친구 코드 입력',
};
const EXPIRED_CODE_ERROR = '초대 코드가 만료됐어요. 새 코드를 발급해 주세요.';
const CODE_ACTION_ERRORS: Record<CodeAction, string> = {
  copy: '코드를 복사하지 못했어요. 코드 영역을 다시 눌러 주세요.',
  share: '공유 창을 열지 못했어요. 위 코드 영역을 눌러 복사해 주세요.',
};

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function useInvitationExpired(expiresAt: string | undefined) {
  const expiryTime = expiresAt ? Date.parse(expiresAt) : null;
  const getSnapshot = useCallback(() => expiryTime !== null && expiryTime <= Date.now(), [expiryTime]);
  const subscribe = useCallback((notify: () => void) => {
    if (expiryTime === null) return () => {};

    // 만료 여부가 바뀔 때만 화면에 알리고, 기기 시간 변경도 계속 확인합니다.
    let expired = getSnapshot();
    const timer = setInterval(() => {
      const nextExpired = getSnapshot();
      if (nextExpired === expired) return;
      expired = nextExpired;
      notify();
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryTime, getSnapshot]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function FriendAddDialog({ onClose, initialMode = 'options' }: Props) {
  const insets = useSafeAreaInsets();
  const [flow] = useState(createFriendInvitationFlow);
  const state = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState);
  const [mode, setMode] = useState(initialMode);
  const [pendingAction, setPendingAction] = useState<CodeAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const actionInProgress = useRef(false);
  const initialGenerationRef = useRef(false);
  const mountedRef = useRef(true);
  const invitation = state.created;
  const expired = useInvitationExpired(invitation?.expiresAt);
  const copied = invitation !== null && copiedCode === invitation.code;
  const copying = pendingAction === 'copy';
  const sharing = pendingAction === 'share';
  const busy = state.busy !== null || pendingAction !== null;
  const enteringCode = mode === 'enter';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
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

  function enterCode() {
    if (busy) return;
    Keyboard.dismiss();
    flow.clearPreview();
    setActionError(null);
    setCopiedCode(null);
    setMode('enter');
  }

  function generateCode() {
    setActionError(null);
    setCopiedCode(null);
    void flow.generate();
  }

  async function runCodeAction(nextAction: CodeAction) {
    if (busy || actionInProgress.current || !invitation) return;
    if (Date.parse(invitation.expiresAt) <= Date.now()) {
      setActionError(EXPIRED_CODE_ERROR);
      return;
    }

    actionInProgress.current = true;
    setPendingAction(nextAction);
    setActionError(null);
    if (nextAction === 'copy') setCopiedCode(null);

    try {
      if (nextAction === 'copy') {
        const success = await Clipboard.setStringAsync(invitation.code);
        if (!success) throw new Error('Clipboard write failed');
        if (mountedRef.current) setCopiedCode(invitation.code);
      } else {
        await Share.share({
          title: '여기남김 친구 초대',
          message: `여기남김 친구 초대 코드: ${invitation.code}\n앱의 친구 화면에서 받은 코드를 입력해 주세요.\n만료: ${formatExpiry(invitation.expiresAt)} (한국 시간)`,
        });
      }
    } catch {
      if (mountedRef.current) setActionError(CODE_ACTION_ERRORS[nextAction]);
    } finally {
      actionInProgress.current = false;
      if (mountedRef.current) setPendingAction(null);
    }
  }

  const codePanelProps = {
    invitation, expired, copied, copying, busy, onGenerate: generateCode,
    onCopy: () => { void runCodeAction('copy'); },
  };
  const error = state.error || actionError;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDialog} disabled={sharing} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'} pointerEvents="box-none"
          style={[s.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[s.dialog, enteringCode && s.enterDialog]} accessibilityViewIsModal onAccessibilityEscape={closeDialog}>
            <View style={[s.header, enteringCode && s.enterHeader]}>
              <Text accessibilityRole="header" style={[s.title, enteringCode && s.enterTitle]}>{TITLES[mode]}</Text>
              {!enteringCode ? <Pressable onPress={closeDialog} disabled={sharing} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" accessibilityState={{ disabled: sharing }} style={s.close}>
                <ComposeIcon name="close" size={20} />
              </Pressable> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.content}>
              {mode === 'options' ? <AddOptions onEnterCode={enterCode} /> : null}
              {mode === 'create' ? (
                <CreateCodePanel {...codePanelProps} sharing={sharing} onShare={() => { void runCodeAction('share'); }} />
              ) : null}
              {enteringCode ? <EnterCodePanel {...codePanelProps} onClose={closeDialog} /> : null}
              {state.busy ? <ActivityIndicator color={C.blue} style={s.status} accessibilityLabel="초대 코드 발급 중" /> : null}
              {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
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

function AddOptions({ onEnterCode }: { onEnterCode: () => void }) {
  return (
    <>
      <Text style={s.description}>{'초대 코드를 보내거나 받은 코드를 입력해\n친구와 연결해 보세요.'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[action.button, action.primary]}>
        <Text style={action.label}>초대 링크 보내기</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onEnterCode} style={[action.button, action.secondary]}>
        <Text style={action.label}>코드로 추가하기</Text>
      </Pressable>
    </>
  );
}

type CodePanelProps = {
  invitation: FriendInvitation | null;
  expired: boolean;
  busy: boolean;
  copied: boolean;
  copying: boolean;
  onCopy: () => void;
  onGenerate: () => void;
};

function CreateCodePanel({
  invitation, expired, busy, copied, copying, onCopy, onGenerate, sharing, onShare,
}: CodePanelProps & { sharing: boolean; onShare: () => void }) {
  const copyDisabled = busy || expired;
  const shareDisabled = copyDisabled || !invitation;

  return (
    <>
      <Text style={s.description}>친구에게 아래 코드를 보내 주세요.</Text>
      {invitation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="초대 코드 복사"
          accessibilityHint="초대 코드를 클립보드에 복사합니다"
          accessibilityState={{ disabled: copyDisabled, busy: copying }}
          disabled={copyDisabled}
          onPress={onCopy}
          style={({ pressed }) => [s.codeCard, (pressed || copying) && s.disabled]}
        >
          <Text style={s.code}>{invitation.code}</Text>
          <Text style={s.notice}>{expired ? '만료된 코드예요' : `${formatExpiry(invitation.expiresAt)}까지 · 한국 시간`}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="초대 코드 공유"
        accessibilityState={{ disabled: shareDisabled }}
        disabled={shareDisabled}
        onPress={onShare}
        style={[action.button, action.primary, shareDisabled && s.disabled]}
      >
        <Text style={action.label}>{sharing ? '공유 중…' : '코드 공유하기'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onGenerate} style={[action.button, action.secondary, busy && s.disabled]}>
        <Text style={action.label}>{invitation ? '새 코드 발급' : '코드 발급'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[s.notice, copied && s.copied]}>
        {copying ? '코드 복사 중…' : copied ? '초대 코드를 복사했어요.' : '코드 영역을 누르면 바로 복사돼요.'}
      </Text>
    </>
  );
}

function EnterCodePanel({
  invitation, expired, busy, copied, copying, onCopy, onGenerate, onClose,
}: CodePanelProps & { onClose: () => void }) {
  return (
    <>
      <Text style={s.enterDescription}>{'친구에게 받은 6자리 코드가 있나요?\n지금 바로 연결해 드릴게요!'}</Text>
      <FriendCodeInput />
      {invitation && !expired ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="내 코드 복사"
          accessibilityState={{ disabled: busy, busy: copying }}
          disabled={busy}
          onPress={onCopy}
          style={s.ownCode}
        >
          <Text style={s.ownCodeLabel}>내 코드</Text>
          <Text style={s.ownCodeValue}>{invitation.code}</Text>
          <Text accessibilityLiveRegion="polite" style={s.ownCodeCopy}>{copied ? '복사됨' : '복사'}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onGenerate}
          style={[action.button, action.secondary, action.compact, s.generateInline, busy && s.disabled]}
        >
          <Text style={[action.label, action.compactLabel]}>코드 생성하기</Text>
        </Pressable>
      )}
      <View style={s.enterActions}>
        <Pressable accessibilityRole="button" onPress={onClose} style={[action.button, s.enterButton, s.cancel]}>
          <Text style={[action.label, s.cancelLabel]}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[action.button, action.primary, s.enterButton]}>
          <Text style={action.label}>친구 추가</Text>
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  layout: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', maxWidth: 329, maxHeight: '100%', flexShrink: 1, borderRadius: 26, backgroundColor: C.background, overflow: 'hidden', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)' },
  enterDialog: { borderRadius: 28, backgroundColor: C.surface, overflow: 'visible' },
  enterOffset: { flexGrow: 1, flexBasis: 0, maxHeight: 48 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12 },
  enterHeader: { minHeight: 0, paddingTop: 24, paddingBottom: 6, paddingRight: 24 },
  title: { flex: 1, fontFamily: FontFamilies.notoSansKrBold, fontSize: 22, lineHeight: 32, color: C.ink, includeFontPadding: false },
  enterTitle: { fontSize: 20, lineHeight: 30 },
  sticker: { position: 'absolute', top: -18, right: -1, width: 52, height: 52, transform: [{ rotate: '12deg' }] },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  description: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 23, color: C.muted, marginBottom: 8, includeFontPadding: false },
  enterDescription: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 20, color: '#8E8E93', includeFontPadding: false, marginBottom: 4 },
  enterActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  enterButton: { flex: 1, paddingHorizontal: 8 },
  cancel: { minHeight: 52, alignSelf: 'center', borderRadius: 26, backgroundColor: '#F2F2F2' },
  cancelLabel: { fontSize: 15, color: '#5A5A5E' },
  generateInline: { alignSelf: 'center' },
  ownCode: { minHeight: 33, minWidth: 174, alignSelf: 'center', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: C.background },
  ownCodeLabel: { fontFamily: FontFamilies.notoSansKrMedium, fontSize: 11, color: C.muted },
  ownCodeValue: { flexShrink: 1, fontFamily: FontFamilies.notoSansKrBold, fontSize: 12, color: C.ink },
  ownCodeCopy: { minWidth: 40, lineHeight: 21, paddingHorizontal: 5, borderRadius: 11, overflow: 'hidden', backgroundColor: C.ink, color: C.surface, textAlign: 'center', fontFamily: FontFamilies.notoSansKrBold, fontSize: 11 },
  codeCard: { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 18, gap: 10, alignItems: 'center' },
  code: { color: C.ink, fontSize: 20, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  notice: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' },
  copied: { color: C.blue },
  error: { color: '#B42318', fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  status: { marginVertical: 4 },
  disabled: { opacity: 0.45 },
});
