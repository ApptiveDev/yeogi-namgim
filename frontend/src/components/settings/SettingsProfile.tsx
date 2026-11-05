import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { SettingsColors as C } from '@/constants/colors';

const PROFILE_AVATAR = require('../../../assets/images/settings-profile-avatar.svg');

export function SettingsProfile({ nickname, email, onEdit }: { nickname: string; email: string; onEdit: () => void }) {
  return (
    <View style={s.card}>
      <View style={s.avatar} accessible accessibilityLabel={`${nickname}님의 프로필 이미지`}>
        <Image source={PROFILE_AVATAR} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <View style={s.identity}>
        <Text numberOfLines={1} style={s.name}>{nickname}</Text>
        <Text numberOfLines={1} style={s.metadata}>{email}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="프로필 편집"
        accessibilityHint="프로필 편집 화면을 엽니다"
        onPress={onEdit}
        style={({ pressed }) => [s.editTouchArea, pressed && s.pressed]}
      >
        <View style={s.editBadge}><Text style={s.editText}>편집</Text></View>
      </Pressable>
    </View>
  );
}

export function SettingsProfilePlaceholder() {
  return (
    <View style={s.card} accessible accessibilityLabel="회원 프로필 불러오는 중" accessibilityState={{ busy: true }}>
      <View style={[s.avatar, s.placeholder]} />
      <View style={s.identity}>
        <View style={[s.placeholder, s.placeholderName]} />
        <View style={[s.placeholder, s.placeholderEmail]} />
      </View>
      <View style={s.editTouchArea}>
        <View style={[s.editBadge, s.placeholder]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 68, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', flexShrink: 0 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: FontFamilies.archivoBlack, fontSize: 16, lineHeight: 20, color: C.ink, includeFontPadding: false },
  metadata: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
  editTouchArea: { width: 46, minHeight: 44, justifyContent: 'center', flexShrink: 0 },
  editBadge: { minHeight: 26, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  editText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 13, lineHeight: 20, color: C.ink, includeFontPadding: false },
  placeholder: { backgroundColor: C.neutral },
  placeholderName: { width: '55%', maxWidth: 96, height: 12, borderRadius: 6 },
  placeholderEmail: { width: '85%', maxWidth: 148, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.65 },
});
