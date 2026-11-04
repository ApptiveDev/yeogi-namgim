import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsColors as C, SettingsFonts as F } from '@/constants/settings';
import type { MyPageModel } from '@/types/my';

export function SettingsProfile({ profile, email, onEdit }: { profile: MyPageModel; email: string; onEdit: () => void }) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = profile.avatarUrl !== failedAvatarUrl ? profile.avatarUrl : null;

  return (
    <View style={s.card}>
      <View style={s.avatar} accessible accessibilityLabel={`${profile.displayName}님의 프로필 이미지`}>
        <Image source={require('../../../assets/images/settings-profile-avatar.svg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailedAvatarUrl(avatarUrl)} /> : null}
      </View>
      <View style={s.identity}>
        <Text numberOfLines={1} style={s.name}>{profile.displayName}</Text>
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

const s = StyleSheet.create({
  card: { minHeight: 68, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', flexShrink: 0 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: F.display, fontSize: 16, lineHeight: 20, color: C.ink, includeFontPadding: false },
  metadata: { fontFamily: F.regular, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
  editTouchArea: { width: 46, minHeight: 44, justifyContent: 'center', flexShrink: 0 },
  editBadge: { minHeight: 26, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  editText: { fontFamily: F.bold, fontSize: 13, lineHeight: 20, color: C.ink, includeFontPadding: false },
  pressed: { opacity: 0.65 },
});
