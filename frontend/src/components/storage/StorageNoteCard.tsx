import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/storage';
import type { StorageNote } from '@/types/storage';

const AUTHOR_LABELS = { me: '내 노트', friend: '친구', anonymous: '익명' } as const;
const BOOKMARK_ICONS = {
  saved: require('../../../assets/images/storage-bookmark-saved.svg'),
  unsaved: require('../../../assets/images/storage-bookmark.svg'),
};

export function StorageNoteCard({ note }: { note: StorageNote }) {
  const createdAt = new Date(note.createdAt);
  return (
    <View style={s.card}>
      <View style={[s.thumbnail, { backgroundColor: note.thumbnailColor }]} accessible={false} />
      <View style={s.content}>
        <Text numberOfLines={1} style={s.title}>{note.title}</Text>
        <Text numberOfLines={1} style={s.metadata}>
          {`${AUTHOR_LABELS[note.author]} · ${note.locationLabel} · ${createdAt.getMonth() + 1}월 ${createdAt.getDate()}일`}
        </Text>
      </View>
      <Image
        source={note.isSaved ? BOOKMARK_ICONS.saved : BOOKMARK_ICONS.unsaved}
        style={s.bookmark}
        contentFit="contain"
        accessible
        accessibilityLabel={note.isSaved ? '저장한 노트' : '저장하지 않은 노트'}
      />
    </View>
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
