import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FriendInvitation, FriendInvitationPreview } from '@/api/friends';
import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { usePopupMotion } from '@/hooks/use-ui-motion';
import { createFriendInvitationFlow } from '@/state/friend-invitation';
import { FRIEND_INVITATION_CODE_LENGTH, LEGACY_FRIEND_INVITATION_CODE_LENGTH } from '@/utils/friends';

import { FriendCodeInput } from './FriendCodeInput';
import { friendActionStyles as action } from './friendActionStyles';

export type FriendAddMode = 'options' | 'create' | 'enter';

type Props = { onClose: () => void; initialMode: FriendAddMode | null };
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
const REQUEST_LABELS = {
  current: '내 초대 코드 조회 중',
  create: '초대 코드 발급 중',
  preview: '친구 코드 확인 중',
  accept: '친구 추가 중',
};

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function useInvitationRemainingSeconds(expiresAt: string | undefined) {
  const expiryTime = expiresAt ? Date.parse(expiresAt) : null;
  const getSnapshot = useCallback(() => (
    expiryTime === null ? 0 : Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000))
  ), [expiryTime]);
  const subscribe = useCallback((notify: () => void) => {
    if (expiryTime === null) return () => {};

    let remaining = getSnapshot();
    const timer = setInterval(() => {
      const nextRemaining = getSnapshot();
      if (nextRemaining === remaining) return;
      remaining = nextRemaining;
      notify();
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryTime, getSnapshot]);

  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

export function FriendAddDialog({ onClose, initialMode }: Props) {
  const motion = usePopupMotion(initialMode);
  if (!motion.content) return null;
  return <FriendAddDialogContent key={motion.content} initialMode={motion.content} onClose={onClose}
    visible={initialMode !== null} motion={motion} />;
}

function FriendAddDialogContent({ onClose, initialMode, visible, motion }: {
  onClose: () => void;
  initialMode: FriendAddMode;
  visible: boolean;
  motion: ReturnType<typeof usePopupMotion<FriendAddMode>>;
}) {
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
  const remainingSeconds = useInvitationRemainingSeconds(invitation?.expiresAt);
  const previewRemainingSeconds = useInvitationRemainingSeconds(state.preview?.expiresAt);
  const expired = invitation !== null && remainingSeconds === 0;
  const copied = invitation !== null && copiedCode === invitation.code;
  const copying = pendingAction === 'copy';
  const sharing = pendingAction === 'share';
  const busy = state.busy !== null || pendingAction !== null;
  const enteringCode = mode === 'enter';
  const canClose = !sharing && state.busy !== 'accept';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (initialMode !== 'create' || initialGenerationRef.current) return;
    initialGenerationRef.current = true;
    void flow.generate();
  }, [flow, initialMode]);

  useEffect(() => {
    if (enteringCode) void flow.loadCurrent();
  }, [enteringCode, flow]);

  function closeDialog() {
    if (!visible || !canClose) return;
    Keyboard.dismiss();
    onClose();
  }

  function enterCode() {
    if (busy) return;
    Keyboard.dismiss();
    setActionError(null);
    setCopiedCode(null);
    setMode('enter');
  }

  async function submitCode() {
    if (busy) return;
    Keyboard.dismiss();
    setActionError(null);
    if (!state.preview) {
      await flow.preview();
      return;
    }
    await flow.accept();
    if (mountedRef.current && flow.getState().accepted) onClose();
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
    invitation, expired, remainingSeconds, copied, copying, busy, onGenerate: generateCode,
    onCopy: () => { void runCodeAction('copy'); },
  };
  const error = state.error || actionError;

  return (
    <Modal transparent animationType="none" onRequestClose={closeDialog}>
      <Animated.View {...motion.interactionProps} style={[s.overlay, { opacity: motion.opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDialog} disabled={!canClose} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'} pointerEvents="box-none"
          style={[s.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Animated.View style={[s.dialog, enteringCode && s.enterDialog, { transform: [{ scale: motion.scale }] }]}
            accessibilityViewIsModal onAccessibilityEscape={closeDialog}>
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
              {enteringCode ? (
                <EnterCodePanel {...codePanelProps} input={state.input} preview={state.preview} canClose={canClose}
                  previewRemainingSeconds={previewRemainingSeconds}
                  onChangeCode={flow.setInput} onSubmit={() => { void submitCode(); }} onClose={closeDialog} />
              ) : null}
              {state.busy ? <LoadingSpinner color={C.blue} style={s.status} accessibilityLabel={REQUEST_LABELS[state.busy]} active={visible} /> : null}
              {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
            </ScrollView>
            {enteringCode ? <Image
              source={require('../../../assets/images/stickers/smiley.png')}
              contentFit="contain"
              style={s.sticker}
              accessible={false}
              pointerEvents="none"
            /> : null}
          </Animated.View>
          {enteringCode ? <View style={s.enterOffset} pointerEvents="none" /> : null}
        </KeyboardAvoidingView>
      </Animated.View>
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
  remainingSeconds: number;
  busy: boolean;
  copied: boolean;
  copying: boolean;
  onCopy: () => void;
  onGenerate: () => void;
};

function CreateCodePanel({
  invitation, expired, remainingSeconds, busy, copied, copying, onCopy, onGenerate, sharing, onShare,
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
          <Text style={s.notice}>{expired ? '만료된 코드예요' : `남은 시간 ${formatRemainingTime(remainingSeconds)}`}</Text>
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
      {!invitation || expired ? (
        <Pressable accessibilityRole="button" disabled={busy} onPress={onGenerate} style={[action.button, action.secondary, busy && s.disabled]}>
          <Text style={action.label}>{expired ? '새 코드 발급' : '코드 발급'}</Text>
        </Pressable>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={[s.notice, copied && s.copied]}>
        {copying ? '코드 복사 중…' : copied ? '초대 코드를 복사했어요.' : '코드 영역을 누르면 바로 복사돼요.'}
      </Text>
    </>
  );
}

function EnterCodePanel({
  invitation, expired, remainingSeconds, busy, copied, copying, onCopy, onGenerate,
  input, preview, previewRemainingSeconds, canClose, onChangeCode, onSubmit, onClose,
}: CodePanelProps & {
  input: string;
  preview: FriendInvitationPreview | null;
  previewRemainingSeconds: number;
  canClose: boolean;
  onChangeCode: (input: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const complete = input.length === FRIEND_INVITATION_CODE_LENGTH || input.length === LEGACY_FRIEND_INVITATION_CODE_LENGTH;
  const submitDisabled = busy || !complete;
  return (
    <>
      <Text style={s.enterDescription}>{'친구에게 받은 6자리 코드가 있나요?\n지금 바로 연결해 드릴게요!'}</Text>
      <FriendCodeInput value={input} onChangeCode={onChangeCode} editable={!busy} />
      {preview ? (
        <View>
          <Text style={s.description} accessibilityLiveRegion="polite">{preview.inviterNickname}님과 친구가 될까요?</Text>
          <Text style={s.notice}>{previewRemainingSeconds === 0 ? '만료된 코드예요' : `남은 시간 ${formatRemainingTime(previewRemainingSeconds)}`}</Text>
        </View>
      ) : null}
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
          <Text style={s.ownCodeValue} numberOfLines={1}>{invitation.code}</Text>
          <Text style={s.countdown}>{formatRemainingTime(remainingSeconds)}</Text>
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
        <Pressable accessibilityRole="button" disabled={!canClose} onPress={onClose} style={[action.button, s.enterButton, s.cancel]}>
          <Text style={[action.label, s.cancelLabel]}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitDisabled }} disabled={submitDisabled}
          onPress={onSubmit} style={[action.button, action.primary, s.enterButton, submitDisabled && s.disabled]}>
          <Text style={action.label}>{preview ? '친구 되기' : '코드 확인'}</Text>
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
  countdown: { fontFamily: FontFamilies.notoSansKrMedium, fontVariant: ['tabular-nums'], fontSize: 11, color: C.muted },
  ownCodeCopy: { minWidth: 40, lineHeight: 21, paddingHorizontal: 5, borderRadius: 11, overflow: 'hidden', backgroundColor: C.ink, color: C.surface, textAlign: 'center', fontFamily: FontFamilies.notoSansKrBold, fontSize: 11 },
  codeCard: { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 18, gap: 10, alignItems: 'center' },
  code: { color: C.ink, fontSize: 20, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  notice: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' },
  copied: { color: C.blue },
  error: { color: '#B42318', fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  status: { marginVertical: 4 },
  disabled: { opacity: 0.45 },
});
