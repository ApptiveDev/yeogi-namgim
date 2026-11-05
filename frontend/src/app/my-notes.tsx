import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MyNote } from '@/api/member';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { BackButton } from '@/components/navigation/BackButton';
import { ScreenColors as C } from '@/constants/colors';
import { useMyNotes } from '@/hooks/use-my-notes';

const VISIBILITY_LABELS = { PUBLIC: '전체 공개', FRIENDS: '친구 공개', PRIVATE: '나만 보기' } as const;
const NOTE_DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' });
const SCREEN_OPTIONS = {
  headerShown: false,
  statusBarStyle: 'dark',
  contentStyle: { backgroundColor: C.background },
} as const;

function backToMyPage() {
  if (router.canGoBack()) router.back();
  else router.replace('/my');
}

function WrittenNotesHeader() {
  return (
    <>
      <BackButton accessibilityLabel="마이페이지로 돌아가기" onPress={backToMyPage} />
      <Text accessibilityRole="header" style={s.title}>내가 작성한 쪽지</Text>
    </>
  );
}

function WrittenNotesEmpty() {
  return <Text style={s.empty}>아직 작성한 쪽지가 없어요.</Text>;
}

function WrittenNoteCard({ note }: { note: MyNote }) {
  return (
    <View style={s.card}>
      <Text style={s.metadata}>{VISIBILITY_LABELS[note.visibility]} · {NOTE_DATE_FORMAT.format(new Date(note.createdAt))}</Text>
      <Text selectable style={s.body}>{note.content}</Text>
      <Text style={s.place}>{note.placeName || note.neighborhood || '장소 정보 없음'}</Text>
    </View>
  );
}

const noteKey = (note: MyNote) => note.noteId;
const renderNote: ListRenderItem<MyNote> = ({ item }) => <WrittenNoteCard note={item} />;

export default function MyNotesScreen() {
  const insets = useSafeAreaInsets();
  const { notes, hasNext, loading, error, refreshing, refresh, loadMore, retry } = useMyNotes();
  const showMore = hasNext && !loading && !error;

  return (
    <View style={s.screen}>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <FlatList
        data={notes}
        keyExtractor={noteKey}
        renderItem={renderNote}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={WrittenNotesHeader}
        ListEmptyComponent={!loading && !error ? WrittenNotesEmpty : null}
        ListFooterComponent={(
          <>
            <AccountLoadState loading={loading} error={error} onRetry={retry} label="작성한 쪽지" />
            {showMore ? (
              <Pressable accessibilityRole="button" accessibilityLabel="작성한 쪽지 더 보기" onPress={loadMore} style={s.more}>
                <Text style={s.moreText}>더 보기</Text>
              </Pressable>
            ) : null}
          </>
        )}
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
