import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import type { StorageNote } from '@/types/storage';

const NOTE_DATE = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' });
const BOOKMARK_ICONS = {
  saved: require('../../../assets/images/storage-bookmark-saved.svg'),
  unsaved: require('../../../assets/images/storage-bookmark.svg'),
};

export function StorageNoteCard({ note, onPress }: { note: StorageNote; onPress?: () => void }) {
  const createdAt = new Date(note.createdAt);
  return (
    <Pressable style={s.card} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityHint={onPress ? '쪽지 상세를 엽니다' : undefined}>
      <View style={[s.thumbnail, { backgroundColor: note.thumbnailColor }]} accessible={false} />
      <View style={s.content}>
        <Text numberOfLines={1} style={s.title}>{note.title}</Text>
        <Text numberOfLines={1} style={s.metadata}>
          {`${note.authorDisplayName} · ${note.locationLabel} · ${NOTE_DATE.format(createdAt)}`}
        </Text>
      </View>
      <Image
        source={note.isSaved ? BOOKMARK_ICONS.saved : BOOKMARK_ICONS.unsaved}
        style={s.bookmark}
        contentFit="contain"
        accessible
        accessibilityLabel={note.isSaved ? '저장한 노트' : '저장하지 않은 노트'}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, backgroundColor: C.surface, borderRadius: 16, boxShadow: '0px 1px 4px 0px rgba(0, 0, 0, 0.04)' },
  thumbnail: { width: 46, height: 46, flexShrink: 0, borderRadius: 10 },
  content: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 15, lineHeight: 22, color: '#0E0E0E', includeFontPadding: false },
  metadata: { fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 18, color: '#8E8E93', includeFontPadding: false },
  bookmark: { width: 22, height: 22, flexShrink: 0 },
});
