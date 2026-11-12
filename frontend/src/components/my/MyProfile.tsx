import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { FontFamilies } from '@/constants/fonts';
import { ScreenColors as C } from '@/constants/colors';

export const MyProfile = memo(function MyProfile({ displayName }: { displayName: string }) {
  return (
    <View style={s.profile}>
      <View style={[s.avatar, s.avatarShadow]} accessible accessibilityLabel={`${displayName}님의 프로필 이미지`}>
        <Image source={require('../../../assets/images/my/avatar.svg')} style={StyleSheet.absoluteFill} contentFit="contain" />
      </View>
      <View style={s.identity}>
        <View style={s.nameBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={s.name}>{displayName}</Text>
          <Text style={s.star} accessible={false}>✦</Text>
        </View>
        <Text numberOfLines={1} style={s.tag}>태그 없음</Text>
        <Text numberOfLines={1} style={s.bio}>아직 한 줄 소개가 없어요.</Text>
      </View>
    </View>
  );
});

export function MyProfileSkeleton() {
  return (
    <Skeleton label="회원 프로필" style={s.profile}>
      <SkeletonBlock style={s.avatar} />
      <View style={s.identity}>
        <SkeletonBlock style={s.badgePlaceholder} />
        <SkeletonBlock style={s.tagPlaceholder} />
        <SkeletonBlock style={s.bioPlaceholder} />
      </View>
    </Skeleton>
  );
}

const s = StyleSheet.create({
  profile: { minHeight: 124, marginTop: 2, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  avatar: { width: 108, height: 108, borderRadius: 54 },
  avatarShadow: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.18)' },
  identity: { flex: 1, minWidth: 0, paddingTop: 6, alignItems: 'flex-start' },
  badgePlaceholder: { width: 122, maxWidth: '100%', height: 36, borderRadius: 18 },
  tagPlaceholder: { width: '42%', height: 12, marginTop: 15 },
  bioPlaceholder: { width: '75%', height: 12, marginTop: 10 },
  nameBadge: { maxWidth: '100%', minWidth: 122, height: 36, paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2, borderColor: C.ink, backgroundColor: C.lime, transform: [{ rotate: '-6deg' }], boxShadow: '0px 2px 0px #0E0E0E' },
  name: { flexShrink: 1, color: C.ink, fontFamily: FontFamilies.archivoBlack, fontSize: 20, lineHeight: 26, includeFontPadding: false },
  star: { color: C.ink, fontSize: 18, lineHeight: 24 },
  tag: { alignSelf: 'stretch', marginTop: 12, fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
  bio: { alignSelf: 'stretch', marginTop: 4, fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
});
