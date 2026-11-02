import { Image } from 'expo-image';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

export function FriendAddDialog({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [isEnteringTag, setIsEnteringTag] = useState(false);
  const [friendTag, setFriendTag] = useState('');

  function closeDialog() {
    Keyboard.dismiss();
    onClose();
  }

  function showAddOptions() {
    Keyboard.dismiss();
    setIsEnteringTag(false);
    setFriendTag('');
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDialog}
          accessibilityRole="button"
          accessibilityLabel="친구 추가 창 닫기"
        />
        <KeyboardAvoidingView
          // Android Modal이 adjustResize를 적용하므로 키보드 높이를 중복으로 빼지 않습니다.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          pointerEvents="box-none"
          style={[s.layout, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={s.dialog} accessibilityViewIsModal onAccessibilityEscape={closeDialog}>
            <View style={[s.header, isEnteringTag && s.tagHeader]}>
              <Text accessibilityRole="header" style={s.title}>{isEnteringTag ? '친구 태그 입력' : '친구 추가'}</Text>
              <Pressable onPress={closeDialog} accessibilityRole="button" accessibilityLabel="친구 추가 창 닫기" style={({ pressed }) => [s.close, pressed && s.pressed]}>
                <ComposeIcon name="close" size={20} />
              </Pressable>
            </View>
            <View style={[s.content, isEnteringTag && s.tagContent]}>
              {isEnteringTag ? <>
                <View style={s.tagField}>
                  <Text style={s.atSign} accessible={false}>@</Text>
                  <TextInput
                    autoFocus
                    value={friendTag}
                    onChangeText={(value) => setFriendTag(value.replace(/^@+/, '').replace(/[\r\n]/g, ''))}
                    accessibilityLabel="친구 태그 입력"
                    accessibilityHint="골뱅이 뒤에 친구의 태그를 입력해주세요"
                    placeholder="태그를 입력해주세요"
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    multiline={false}
                    numberOfLines={1}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    underlineColorAndroid="transparent"
                    style={s.input}
                  />
                </View>
                <Pressable disabled accessibilityRole="button" accessibilityLabel="친구 추가, 준비 중" accessibilityState={{ disabled: true }} style={[s.button, s.submitButton]}>
                  <Text style={s.submitLabel}>친구 추가</Text>
                </Pressable>
                <Text style={[s.notice, s.tagNotice]}>친구 추가 기능은 준비 중이에요.</Text>
                <Pressable onPress={showAddOptions} accessibilityRole="button" style={({ pressed }) => [s.backButton, pressed && s.pressed]}>
                  <Text style={s.backLabel}>다른 방법으로 추가</Text>
                </Pressable>
              </> : <>
                <Text style={s.description}>{'초대링크를 보내거나 친구 태그를 입력해\n친구와 쪽지 소식을 나눠보세요.'}</Text>
                <Pressable
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel="초대링크 보내기"
                  accessibilityHint="준비 중인 기능이에요"
                  accessibilityState={{ disabled: true }}
                  style={[s.button, s.inviteButton]}
                >
                  <Text style={s.buttonLabel}>초대링크 보내기</Text>
                  <Image source={require('../../../assets/images/friends-link.svg')} style={s.linkIcon} contentFit="contain" accessible={false} />
                </Pressable>
                <View style={s.divider} accessible={false}>
                  <View style={s.line} /><Text style={s.or}>또는</Text><View style={s.line} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsEnteringTag(true)}
                  style={({ pressed }) => [s.button, s.tagButton, pressed && s.pressed]}
                >
                  <Text style={s.buttonLabel}>친구 태그 입력</Text>
                </Pressable>
                <Text style={s.notice}>초대와 친구 추가 기능은 준비 중이에요.</Text>
              </>}
            </View>
          </View>
          {isEnteringTag ? <View style={s.tagKeyboardGap} pointerEvents="none" /> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  layout: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dialog: { width: '100%', maxWidth: 400, flexShrink: 0, borderRadius: 26, backgroundColor: C.background, overflow: 'hidden', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)' },
  // 중앙보다 최대 24px 위에 배치하고, 키보드로 공간이 좁아지면 여백부터 줄입니다.
  tagKeyboardGap: { height: 48, flexShrink: 1 },
  header: { minHeight: 72, flexShrink: 0, flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12, paddingTop: 8 },
  tagHeader: { minHeight: 64, paddingTop: 0 },
  title: { flex: 1, fontFamily: F.bold, fontSize: 22, lineHeight: 32, color: C.ink, includeFontPadding: false },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 28 },
  tagContent: { paddingBottom: 16 },
  description: { fontFamily: F.regular, fontSize: 13, lineHeight: 23, color: C.muted, marginBottom: 24, includeFontPadding: false },
  button: { minHeight: 54, flexShrink: 0, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inviteButton: { backgroundColor: C.lime },
  tagButton: { backgroundColor: C.surface },
  buttonLabel: { fontFamily: F.bold, fontSize: 14, lineHeight: 24, color: C.ink, textAlign: 'center', includeFontPadding: false },
  linkIcon: { width: 20, height: 20, flexShrink: 0 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: '#E3E3DF' },
  or: { fontFamily: F.regular, fontSize: 12, lineHeight: 18, color: C.muted },
  tagField: { height: 54, flexShrink: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E3E3DF', borderRadius: 16, backgroundColor: C.surface },
  atSign: { fontFamily: F.medium, fontSize: 15, lineHeight: 24, color: C.ink, includeFontPadding: false },
  input: { flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 0, paddingVertical: 0, fontFamily: F.regular, fontSize: 14, color: C.ink, includeFontPadding: false, textAlignVertical: 'center' },
  submitButton: { marginTop: 12, backgroundColor: '#E3E3DF' },
  submitLabel: { fontFamily: F.bold, fontSize: 14, lineHeight: 24, color: C.muted },
  notice: { marginTop: 18, fontFamily: F.regular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' },
  tagNotice: { marginTop: 12 },
  backButton: { minHeight: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: C.ink },
  pressed: { opacity: 0.65 },
});
