import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MyColors as C, MyFonts as F } from '@/constants/my';
import type { MyPageModel } from '@/types/my';

export function MyProfile({ profile }: { profile: MyPageModel }) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = profile.avatarUrl !== failedAvatarUrl ? profile.avatarUrl : null;
  const tag = profile.tag ? `@${profile.tag.replace(/^@+/, '')}` : '태그 없음';

  return (
    <View style={s.profile}>
      <View style={s.avatar} accessible accessibilityLabel={`${profile.displayName}님의 프로필 이미지`}>
        <Image source={require('../../../assets/images/my/avatar.svg')} style={StyleSheet.absoluteFill} contentFit="contain" />
        {avatarUrl && <Image source={{ uri: avatarUrl }} style={s.avatarPhoto} contentFit="cover" onError={() => setFailedAvatarUrl(avatarUrl)} />}
      </View>
      <View style={s.identity}>
        <View style={s.nameBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={s.name}>{profile.displayName}</Text>
          <Text style={s.star} accessible={false}>✦</Text>
        </View>
        <Text numberOfLines={1} style={s.tag}>{tag}</Text>
        <Text numberOfLines={1} style={[s.bio, !profile.bio && s.emptyBio]}>{profile.bio || '아직 한 줄 소개가 없어요.'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  profile: { minHeight: 124, marginTop: 2, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  avatar: { width: 108, height: 108, borderRadius: 54, boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.18)' },
  avatarPhoto: { position: 'absolute', top: 4, left: 4, width: 100, height: 100, borderRadius: 50 },
  identity: { flex: 1, minWidth: 0, paddingTop: 6, alignItems: 'flex-start' },
  nameBadge: { maxWidth: '100%', minWidth: 122, height: 36, paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2, borderColor: C.ink, backgroundColor: C.lime, transform: [{ rotate: '-6deg' }], boxShadow: '0px 2px 0px #0E0E0E' },
  name: { flexShrink: 1, color: C.ink, fontFamily: F.display, fontSize: 20, lineHeight: 26, includeFontPadding: false },
  star: { color: C.ink, fontSize: 18, lineHeight: 24 },
  tag: { alignSelf: 'stretch', marginTop: 12, fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
  bio: { alignSelf: 'stretch', marginTop: 4, fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  emptyBio: { color: C.muted },
});
