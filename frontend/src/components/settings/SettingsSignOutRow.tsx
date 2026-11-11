import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { authErrorMessage } from '@/api/auth';
import { signOut } from '@/auth/member-session';
import { FontFamilies } from '@/constants/fonts';
import { SettingsColors as C } from '@/constants/colors';

import { SettingsRow } from './SettingsRow';

export function SettingsSignOutRow() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function openConfirmation() {
    if (busy.current) return;
    setError(null);
    setIsOpen(true);
  }

  function closeConfirmation() {
    if (busy.current) return;
    setIsOpen(false);
    setError(null);
  }

  async function confirmSignOut() {
    if (!isOpen || busy.current) return;
    busy.current = true;
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      if (mounted.current) setIsOpen(false);
    } catch (failure) {
      if (mounted.current) setError(authErrorMessage(failure));
    } finally {
      busy.current = false;
      if (mounted.current) setIsSigningOut(false);
    }
  }

  return (
    <>
      <SettingsRow
        label={isSigningOut ? '로그아웃 중…' : '로그아웃'}
        disabled={isSigningOut}
        accessibilityHint="로그아웃 확인 창을 엽니다"
        onPress={openConfirmation}
      />
      <Modal
        visible={isOpen}
        transparent
        animationType={reduceMotion ? 'none' : 'fade'}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeConfirmation}
      >
        <View style={s.overlay}>
          <Pressable style={s.backdrop} onPress={closeConfirmation} disabled={isSigningOut} accessible={false} />
          <View style={s.card} accessibilityViewIsModal onAccessibilityEscape={closeConfirmation}>
            <Text style={s.title} accessibilityRole="header">로그아웃할까요?</Text>
            <Text style={s.description}>{'다시 로그인하면 쪽지와 스티커는\n그대로 남아 있어요'}</Text>
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text> : null}
            <View style={s.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="로그아웃 취소"
                accessibilityState={{ disabled: isSigningOut }}
                disabled={isSigningOut}
                onPress={closeConfirmation}
                style={({ pressed }) => [s.button, s.cancel, pressed && s.pressed, isSigningOut && s.disabled]}
              >
                <Text style={[s.buttonText, s.cancelText]}>취소</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isSigningOut ? '로그아웃 중' : '로그아웃하기'}
                accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
                disabled={isSigningOut}
                onPress={() => { void confirmSignOut(); }}
                style={({ pressed }) => [s.button, s.confirm, pressed && s.pressed]}
              >
                {isSigningOut ? <ActivityIndicator color={C.surface} /> : <Text style={[s.buttonText, s.confirmText]}>로그아웃하기</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14, 14, 14, 0.45)' },
  card: { width: '100%', maxWidth: 313, borderRadius: 26, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.surface, boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.2)' },
  title: { fontFamily: FontFamilies.notoSansKrBold, color: C.ink, fontSize: 19, lineHeight: 28, textAlign: 'center', includeFontPadding: false },
  description: { marginTop: 8, fontFamily: FontFamilies.notoSansKrMedium, color: '#5A5A5E', fontSize: 13, lineHeight: 19, textAlign: 'center', includeFontPadding: false },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 24 },
  button: { flex: 1, minHeight: 50, borderRadius: 25, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: '#F0F0F0' },
  confirm: { backgroundColor: C.ink },
  buttonText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 15, lineHeight: 22, textAlign: 'center', includeFontPadding: false },
  cancelText: { color: '#5A5A5E' },
  confirmText: { color: C.surface },
  error: { marginTop: 12, color: C.destructive, fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
