import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { MyColors as C } from '@/constants/my';

const STICKER_PREVIEWS = [
  require('../../../assets/images/my/sparkle.png'),
  require('../../../assets/images/my/cherry.png'),
  require('../../../assets/images/my/disc.png'),
  require('../../../assets/images/my/cat.png'),
  require('../../../assets/images/my/clover.png'),
];

export function MyComingSoonSections() {
  return (
    <>
      <View style={s.quest} accessible accessibilityLabel="MY QUEST, 준비 중">
        <View style={s.sectionHeader}>
          <Text accessibilityRole="header" style={[s.heading, s.white]}>MY QUEST</Text>
          <View style={s.questBadge}><Text style={s.badgeText}>준비 중</Text></View>
        </View>
        <View style={s.questContent}>
          <Image source={require('../../../assets/images/my/camera.png')} style={s.camera} contentFit="contain" />
          <View style={s.questCopy}>
            <Text style={s.questTitle}>{'새로운 퀘스트를\n준비하고 있어요.'}</Text>
            <Text style={s.description}>곧 만나요!</Text>
          </View>
        </View>
      </View>
      <View style={s.stickers} accessible accessibilityLabel="MY STICKERS, 준비 중. 스티커 미리보기">
        <View style={s.sectionHeader}>
          <Text accessibilityRole="header" style={s.heading}>MY STICKERS</Text>
          <View style={s.stickerBadge}><Text style={s.badgeText}>준비 중</Text></View>
        </View>
        <View style={s.stickerTray}>
          {STICKER_PREVIEWS.map((source, index) => <Image key={index} source={source} style={s.sticker} contentFit="contain" />)}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  quest: { marginTop: 12, padding: 14, paddingBottom: 12, borderRadius: 24, backgroundColor: C.blue },
  sectionHeader: { minHeight: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontFamily: FontFamilies.archivoBlack, fontSize: 15, lineHeight: 20, color: C.ink, includeFontPadding: false },
  white: { color: C.surface },
  questBadge: { minHeight: 24, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2, backgroundColor: '#13205A', justifyContent: 'center' },
  badgeText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 11, lineHeight: 18, color: C.surface, includeFontPadding: false },
  questContent: { minHeight: 84, padding: 12, marginTop: 6, borderRadius: 18, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  camera: { width: 70, height: 60 },
  questCopy: { flex: 1, gap: 4 },
  questTitle: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 13, lineHeight: 19, color: C.ink, includeFontPadding: false },
  description: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 17, color: C.muted, includeFontPadding: false },
  stickers: { marginTop: 12 },
  stickerBadge: { minHeight: 24, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2, backgroundColor: '#1C1C1E', justifyContent: 'center' },
  stickerTray: { minHeight: 64, marginTop: 4, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 20, backgroundColor: C.surface },
  sticker: { width: 44, height: 44, opacity: 0.55 },
});
