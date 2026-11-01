import { useFonts } from 'expo-font';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StorageCalendar } from '@/components/storage/StorageCalendar';
import { StorageEmptyState } from '@/components/storage/StorageEmptyState';
import { StorageFilters } from '@/components/storage/StorageFilters';
import { StorageHeader } from '@/components/storage/StorageHeader';
import { StorageNoteCard } from '@/components/storage/StorageNoteCard';
import { STORAGE_FILTERS, StorageColors as C } from '@/constants/storage';
import { resolveStorageNotes, STORAGE_COUNT_PREVIEW, STORAGE_NOTES_RESPONSE } from '@/data/storage-notes';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useStorageNotes } from '@/hooks/use-storage-notes';

function openCompose() {
  router.dismissTo({ pathname: '/', params: { compose: 'true' } });
}

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const { mockDataEnabled, isReady } = useDeveloperSettings();
  const { filter: requestedFilter } = useLocalSearchParams<{ filter?: string | string[] }>();
  // URL을 기준으로 선택해, 이미 열린 보관함으로 돌아올 때도 요청한 필터를 적용합니다.
  const filter = STORAGE_FILTERS.find((item) => item.id === requestedFilter)?.id ?? 'all';
  const storage = useStorageNotes(resolveStorageNotes(STORAGE_NOTES_RESPONSE, mockDataEnabled), filter);
  const [today, setToday] = useState(() => new Date());
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
    'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
  });

  useEffect(() => {
    const refreshToday = () => setToday(new Date());
    const timer = setInterval(refreshToday, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshToday();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ animation: 'none', statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      {(!fontsLoaded && !fontError) || !isReady ? (
        <View style={s.loading}><ActivityIndicator color={C.blue} accessibilityLabel="보관함 준비 중" /></View>
      ) : (
        <FlatList
          data={storage.visibleNotes}
          keyExtractor={(note) => note.id}
          renderItem={({ item }) => <StorageNoteCard note={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}
          ListHeaderComponent={<>
            <StorageHeader />
            <StorageFilters selected={storage.filter} counts={(mockDataEnabled ? STORAGE_COUNT_PREVIEW : null) ?? storage.counts} onSelect={(nextFilter) => router.setParams({ filter: nextFilter })} />
            <StorageCalendar month={storage.month} today={today} selectedDate={storage.selectedDate} markedDates={storage.markedDates} onChangeMonth={storage.changeMonth} onSelectDate={storage.selectDate} onToday={storage.goToToday} />
          </>}
          ListEmptyComponent={<StorageEmptyState
            title={storage.selectedDate ? '이날의 노트가 없어요' : storage.activeFilter.emptyTitle}
            description={storage.selectedDate ? '다른 날짜를 선택하거나\n새로운 쪽지를 남겨보세요.' : storage.activeFilter.emptyDescription}
            onCompose={openCompose}
          />}
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
});
