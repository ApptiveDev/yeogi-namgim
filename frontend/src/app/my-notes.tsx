import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MyNote } from '@/api/member';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { BackButton } from '@/components/navigation/BackButton';
import { MyColors as C } from '@/constants/my';
import { useMyNotes } from '@/hooks/use-my-notes';

const VISIBILITY_LABELS = { PUBLIC: '전체 공개', FRIENDS: '친구 공개', PRIVATE: '나만 보기' } as const;

function WrittenNoteCard({ note }: { note: MyNote }) {
  return (
    <View style={s.card}>
      <Text style={s.metadata}>{VISIBILITY_LABELS[note.visibility]} · {new Date(note.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</Text>
      <Text selectable style={s.body}>{note.content}</Text>
      <Text style={s.place}>{note.placeName || note.neighborhood || '장소 정보 없음'}</Text>
    </View>
  );
}

export default function MyNotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useMyNotes();
  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      <FlatList data={notes.notes} keyExtractor={(note) => note.noteId} renderItem={({ item }) => <WrittenNoteCard note={item} />}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        refreshing={notes.loading && notes.page < 0} onRefresh={notes.refresh}
        ListHeaderComponent={<>
          <BackButton accessibilityLabel="마이페이지로 돌아가기"
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/my'); }} />
          <Text accessibilityRole="header" style={s.title}>내가 작성한 쪽지</Text>
        </>}
        ListEmptyComponent={!notes.loading && !notes.error ? <Text style={s.empty}>아직 작성한 쪽지가 없어요.</Text> : null}
        ListFooterComponent={<>
          <AccountLoadState loading={notes.loading} error={notes.error} onRetry={notes.retry} label="작성한 쪽지" />
          {notes.hasNext && !notes.loading && !notes.error ? (
            <Pressable accessibilityRole="button" accessibilityLabel="작성한 쪽지 더 보기" onPress={notes.loadMore} style={s.more}>
              <Text style={s.moreText}>더 보기</Text>
            </Pressable>
          ) : null}
        </>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  moreText: { color: C.ink, fontSize: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: C.ink, marginVertical: 16 },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 12, gap: 10 },
  metadata: { color: C.muted, fontSize: 12, lineHeight: 18 },
  body: { color: C.ink, fontSize: 16, lineHeight: 25 },
  place: { color: C.muted, fontSize: 13, lineHeight: 20 },
  empty: { color: C.muted, textAlign: 'center', marginVertical: 40, fontSize: 15 },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: C.lime, marginTop: 8 },
});
