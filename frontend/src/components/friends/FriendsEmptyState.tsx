import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

export function FriendsEmptyState() {
  return (
    <View style={s.container}>
      <View style={s.copy}>
        <Text accessibilityRole="header" style={s.title}>아직 친구가 없어요</Text>
        <Text style={s.description}>{'친구를 초대하면 친구가 남긴\n쪽지 소식이 여기에 떠요'}</Text>
      </View>
      <View style={s.actions}>
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
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel="친구 태그 입력"
          accessibilityHint="준비 중인 기능이에요"
          accessibilityState={{ disabled: true }}
          style={[s.button, s.tagButton]}
        >
          <Text style={s.buttonLabel}>친구 태그 입력</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1 },
  copy: { flexGrow: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 4, paddingVertical: 40 },
  title: { fontFamily: F.bold, fontSize: 20, lineHeight: 30, color: C.ink, textAlign: 'center', includeFontPadding: false },
  description: { fontFamily: F.regular, fontSize: 14, lineHeight: 24, color: C.muted, textAlign: 'center', includeFontPadding: false },
  actions: { gap: 12, paddingTop: 24 },
  button: { minHeight: 54, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inviteButton: { backgroundColor: C.lime },
  tagButton: { backgroundColor: C.surface },
  buttonLabel: { fontFamily: F.bold, fontSize: 15, lineHeight: 24, color: C.ink, textAlign: 'center', includeFontPadding: false },
  linkIcon: { width: 20, height: 20, flexShrink: 0 },
});
