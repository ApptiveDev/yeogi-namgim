import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Easing, Keyboard, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComposeIcon } from './ComposeIcon';

export type NoteVisibility = 'public' | 'friends' | 'private';
export interface NoteDraft {
  content: string;
  visibility: NoteVisibility;
}

export const INITIAL_NOTE_DRAFT: NoteDraft = {
  content: '', visibility: 'public',
};
const VISIBILITY_OPTIONS = [
  { value: 'public', label: '공개', title: '공개 지도', description: '누구나 이 장소에서\n발견할 수 있어요', icon: 'globe' },
  { value: 'friends', label: '친구', title: '친구 지도', description: '친구가 이 장소에서\n발견할 수 있어요', icon: 'friends' },
  { value: 'private', label: '개인', title: '개인 지도', description: '나만 이 장소에서\n다시 볼 수 있어요', icon: 'lock' },
] as const;

export interface NoteComposeSheetProps {
  height: number;
  draft: NoteDraft;
  locationLabel: string;
  locationReady: boolean;
  onChange: (draft: NoteDraft) => void;
  onClose: () => void;
  onSubmit?: (draft: NoteDraft) => void;
}

export function NoteComposeSheet({
  height, draft, locationLabel, locationReady, onChange, onClose, onSubmit,
}: NoteComposeSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const closing = useRef(false);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const selectedVisibility = VISIBILITY_OPTIONS.find((option) => option.value === draft.visibility)!;
  const canSubmit = Boolean(onSubmit && locationReady && draft.content.trim());

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardTop(event.endCoordinates.screenY));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(null));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(translateY, {
      toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [translateY]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: height, duration: 220, useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => { if (finished) onClose(); });
  }, [height, onClose, translateY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close]);

  return (
    <KeyboardAvoidingView
      pointerEvents="box-none"
      style={s.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[s.sheet, {
        height: keyboardTop === null ? height : Math.min(height, Math.max(220, keyboardTop - insets.top)),
        transform: [{ translateY }],
      }]} accessibilityViewIsModal>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>쪽지 작성</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="작성 화면 닫기" onPress={close} style={s.closeButton}>
            <ComposeIcon name="close" />
          </Pressable>
        </View>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.visibilityRow}>
            <View style={s.visibilityOptions}>
              <View style={s.visibilityTrack} />
              {VISIBILITY_OPTIONS.map((option) => {
                const selected = option.value === draft.visibility;
                return (
                  <View key={option.value} style={s.visibilityOption}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} 범위 선택`}
                      accessibilityState={{ selected }}
                      aria-selected={selected}
                      onPress={() => onChange({ ...draft, visibility: option.value })}
                      style={[s.visibilityButton, selected && s.visibilityButtonSelected]}
                    >
                      <ComposeIcon name={option.icon} color={selected ? '#FFFFFF' : '#191919'} />
                    </Pressable>
                    <Text style={[s.visibilityLabel, selected && s.visibilityLabelSelected]}>{option.label}</Text>
                  </View>
                );
              })}
            </View>
            <View style={s.visibilityDescription}>
              <Text style={s.visibilityTitle}>{selectedVisibility.title}</Text>
              <Text style={s.description}>{selectedVisibility.description}</Text>
            </View>
          </View>

          <View style={s.locationRow}>
            <ComposeIcon name="location" size={20} />
            <Text style={s.locationName} numberOfLines={1}>{locationLabel}</Text>
            <Text style={s.locationCaption}>{locationReady ? '현재 위치' : '위치 확인 중'}</Text>
          </View>

          <View style={s.editor}>
            <TextInput
              accessibilityLabel="쪽지 내용"
              placeholder={'이 장소에 남길 이야기를 적어주세요.\n지나가는 누군가가 발견하게 돼요.'}
              placeholderTextColor="#B0B0B0"
              value={draft.content}
              onChangeText={(content) => onChange({ ...draft, content })}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={s.textInput}
            />
            <Text style={s.characterCount}>{draft.content.length} / 500</Text>
          </View>

        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="쪽지 남기기"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={() => onSubmit?.(draft)}
            style={({ pressed }) => [s.submitButton, pressed && s.dimmed]}
          ><Text style={s.submitText}>쪽지 남기기</Text></Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 30 },
  sheet: { backgroundColor: '#FAFAFA', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#D5D5D5', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 10, paddingBottom: 16 },
  title: { fontFamily: 'Pretendard-Bold', fontSize: 20, color: '#171717' },
  closeButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#D9D9D9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 25, paddingBottom: 16 },
  sectionLabel: { fontFamily: 'Pretendard-Regular', fontSize: 12, color: '#929292', marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  visibilityOptions: { flex: 1.65, maxWidth: 202, flexDirection: 'row', justifyContent: 'space-between' },
  visibilityTrack: { position: 'absolute', top: 18, left: 20, right: 20, height: 18, backgroundColor: '#FFFFFF', borderColor: '#D9D9D9', borderWidth: 1 },
  visibilityOption: { alignItems: 'center' },
  visibilityButton: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#D9D9D9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  visibilityButtonSelected: { backgroundColor: '#171717', borderColor: '#171717' },
  visibilityLabel: { fontFamily: 'Pretendard-Regular', fontSize: 11, color: '#999999', marginTop: 7 },
  visibilityLabelSelected: { fontFamily: 'Pretendard-Bold', color: '#171717' },
  visibilityDescription: { flex: 1, paddingLeft: 20 },
  visibilityTitle: { fontFamily: 'Pretendard-Bold', fontSize: 14, color: '#191919', marginBottom: 5 },
  description: { fontFamily: 'Pretendard-Regular', fontSize: 11, lineHeight: 16, color: '#999999' },
  locationRow: { height: 50, paddingHorizontal: 14, borderRadius: 25, borderWidth: 1, borderColor: '#D9D9D9', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  locationName: { flex: 1, fontFamily: 'Pretendard-Regular', fontSize: 14, color: '#191919' },
  locationCaption: { fontFamily: 'Pretendard-Regular', fontSize: 10, color: '#999999' },
  editor: { height: 180, borderRadius: 24, borderWidth: 1, borderColor: '#D9D9D9', backgroundColor: '#FFFFFF', padding: 14 },
  textInput: { flex: 1, fontFamily: 'Pretendard-Regular', fontSize: 14, lineHeight: 22, color: '#191919', padding: 0, paddingBottom: 16 },
  characterCount: { position: 'absolute', right: 16, bottom: 9, fontFamily: 'Pretendard-Regular', fontSize: 10, color: '#999999' },
  footer: { paddingHorizontal: 25, paddingTop: 12 },
  submitButton: { height: 54, borderRadius: 27, backgroundColor: '#FFCC3D', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontFamily: 'Pretendard-Bold', fontSize: 14, color: '#171717' },
  dimmed: { opacity: 0.7 },
});
