import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MapNotePreview } from '@/api/types';
import { FontFamilies } from '@/constants/fonts';

const ASSETS = {
  grid: require('../../../assets/images/note-detail/grid.svg'),
  lock: require('../../../assets/images/note-compose/visibility-private-selected.svg'),
  pin: require('../../../assets/images/note-preview/pin.svg'),
  arrow: require('../../../assets/images/note-compose/arrow.svg'),
};

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function SingleNotePreview({ note, onOpen }: { note: MapNotePreview; onOpen: () => void }) {
  const createdAt = Date.parse(note.createdAt);
  return (
    <ScrollView contentContainerStyle={s.content} nestedScrollEnabled>
      <Pressable onPress={onOpen} style={s.paper} accessibilityRole="button" accessibilityLabel="눌러서 쪽지 열어보기">
        <Image source={ASSETS.grid} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        <Text style={s.blurredText} numberOfLines={4} accessible={false} aria-hidden>{note.preview}</Text>
        <View style={s.openPill}>
          <Image source={ASSETS.lock} style={s.lock} tintColor="#D6F65A" contentFit="contain" accessible={false} />
          <Text style={s.pillText}>눌러서 쪽지 열어보기</Text>
        </View>
      </Pressable>
      <View style={s.location}>
        <Image source={ASSETS.pin} style={s.icon22} contentFit="contain" accessible={false} />
        <View style={s.locationText}>
          <Text style={s.address} numberOfLines={1}>{note.placeName || note.neighborhood || '장소 정보 없음'}</Text>
          {Number.isFinite(createdAt) && <Text style={s.date}>{DATE_FORMAT.format(createdAt)}</Text>}
        </View>
      </View>
      <Pressable onPress={onOpen} style={s.detailButton} accessibilityRole="button">
        <Text style={s.detailText}>이 노트 자세히 보기</Text>
        <Image source={ASSETS.arrow} style={s.icon22} contentFit="contain" accessible={false} />
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 2, paddingBottom: 16, gap: 14 },
  paper: { minHeight: 208, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 13, gap: 8,
    overflow: 'hidden', backgroundColor: '#EEE6D3', borderRadius: 14 },
  blurredText: { marginHorizontal: 6, fontFamily: 'NanumPen', fontSize: 21, lineHeight: 30, color: '#1C1C1E04',
    textShadowColor: '#1C1C1EBA', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 9 },
  openPill: { alignSelf: 'flex-start', marginTop: 'auto', minHeight: 25, flexDirection: 'row',
    alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#0E0E0E' },
  lock: { width: 12, height: 12 },
  pillText: { flexShrink: 1, fontFamily: FontFamilies.notoSansKrBold, fontSize: 11, color: '#FFFFFF', includeFontPadding: false },
  location: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 16, backgroundColor: '#FFFFFF' },
  icon22: { width: 22, height: 22 },
  locationText: { flex: 1, minWidth: 0 },
  address: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 14, lineHeight: 22, color: '#0E0E0E', includeFontPadding: false },
  date: { fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 16, color: '#8E8E93', includeFontPadding: false },
  detailButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 24, borderRadius: 999, backgroundColor: '#D6F65A' },
  detailText: { flexShrink: 1, fontFamily: FontFamilies.notoSansKrBold, fontSize: 17, color: '#0E0E0E', includeFontPadding: false },
});
