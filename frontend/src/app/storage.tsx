import { useFonts } from 'expo-font';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabBar from '@/components/navigation/BottomTabBar';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import { StorageCalendar } from '@/components/storage/StorageCalendar';
import { StorageEmptyState } from '@/components/storage/StorageEmptyState';
import { StorageFilters } from '@/components/storage/StorageFilters';
import { StorageHeader } from '@/components/storage/StorageHeader';
import { StorageNoteCard } from '@/components/storage/StorageNoteCard';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { STORAGE_FILTERS } from '@/constants/storage';
import { useArchiveNotes } from '@/hooks/use-archive-notes';
import { useStorageCalendar } from '@/hooks/use-storage-calendar';
import type { StorageFilter, StorageNote } from '@/types/storage';
import { dateKey, getSeoulToday } from '@/utils/storage-calendar';

const STORAGE_FONTS = {
  [FontFamilies.archivoBlack]: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  [FontFamilies.notoSansKrRegular]: require('../../assets/fonts/NotoSansKR-Regular.otf'),
  [FontFamilies.notoSansKrMedium]: require('../../assets/fonts/NotoSansKR-Medium.otf'),
  [FontFamilies.notoSansKrBold]: require('../../assets/fonts/NotoSansKR-Bold.otf'),
  [FontFamilies.interSemiBold]: require('../../assets/fonts/Inter-SemiBold.otf'),
};
const SCREEN_OPTIONS = {
  animation: 'none',
  statusBarStyle: 'dark',
  contentStyle: { backgroundColor: C.background },
} as const;
const EMPTY_NOTES: readonly StorageNote[] = [];
const EMPTY_DATES: ReadonlySet<string> = new Set();
const EMPTY_DAY = {
  emptyTitle: '이날의 노트가 없어요',
  emptyDescription: '다른 날짜를 선택하거나\n새로운 쪽지를 남겨보세요.',
};

const noteKey = (note: StorageNote) => note.id;
const renderNote: ListRenderItem<StorageNote> = ({ item }) => (
  <StorageNoteCard note={item} onPress={item.openable ? () => {
    router.push({ pathname: '/note/[noteId]', params: { noteId: item.id, skipLocation: 'true' } });
  } : undefined} />
);

function openCompose() {
  router.dismissTo({ pathname: '/', params: { compose: 'true' } });
}

function selectFilter(filter: StorageFilter) {
  router.setParams({ filter });
}

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts(STORAGE_FONTS);
  const { filter: requestedFilter } = useLocalSearchParams<{ filter?: string | string[] }>();
  // URL을 기준으로 선택해, 이미 열린 보관함으로 돌아올 때도 요청한 필터를 적용합니다.
  const filter = STORAGE_FILTERS.find((item) => item.id === requestedFilter)?.id ?? 'all';
  const storage = useStorageCalendar(filter);
  const monthKey = dateKey(storage.month).slice(0, 7);
  const archive = useArchiveNotes(monthKey, storage.selectedDate, filter);
  const isFriends = filter === 'friends';
  const [today, setToday] = useState(getSeoulToday);
  const isLoading = !fontsLoaded && !fontError;
  const emptyState = storage.selectedDate ? EMPTY_DAY : storage.activeFilter;

  useFocusEffect(useCallback(() => {
    function refreshToday() {
      const next = getSeoulToday();
      setToday((current) => current.getTime() === next.getTime() ? current : next);
    }

    refreshToday();
    const timer = setInterval(refreshToday, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshToday();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []));

  return (
    <View style={s.screen}>
      <Stack.Screen options={SCREEN_OPTIONS} />
      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator color={C.blue} accessibilityLabel="보관함 준비 중" />
        </View>
      ) : (
        <FlatList
          data={isFriends ? EMPTY_NOTES : archive.notes}
          keyExtractor={noteKey}
          renderItem={renderNote}
          showsVerticalScrollIndicator={false}
          refreshing={!isFriends && archive.refreshing}
          onRefresh={isFriends ? undefined : () => { void archive.refresh(); }}
          contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}
          ListHeaderComponent={(
            <>
              <StorageHeader />
              <StorageFilters selected={storage.filter} counts={archive.counts} onSelect={selectFilter} />
              <StorageCalendar
                month={storage.month}
                today={today}
                selectedDate={storage.selectedDate}
                markedDates={isFriends ? EMPTY_DATES : archive.markedDates}
                onChangeMonth={storage.changeMonth}
                onSelectDate={storage.selectDate}
                onSelectMonth={storage.selectMonth}
              />
            </>
          )}
          ListEmptyComponent={isFriends || (!archive.loading && !archive.error && !archive.next) ? (
            <StorageEmptyState
              title={emptyState.emptyTitle}
              description={emptyState.emptyDescription}
              onCompose={openCompose}
            />
          ) : null}
          ListFooterComponent={isFriends ? null : (
            <>
              <AccountLoadState loading={archive.loading} error={archive.error} onRetry={() => { void archive.retry(); }} label="보관함" />
              {archive.next && !archive.loading && !archive.error ? (
                <Pressable accessibilityRole="button" accessibilityLabel="보관함 쪽지 더 보기" onPress={() => { void archive.loadMore(); }} style={s.more}>
                  <Text style={s.moreText}>더 보기</Text>
                </Pressable>
              ) : null}
            </>
          )}
        />
      )}
      <BottomTabBar selectedTab="storage" onAddPress={openCompose} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: C.lime, marginTop: 16 },
  moreText: { fontFamily: FontFamilies.notoSansKrBold, color: C.ink, fontSize: 14 },
});
