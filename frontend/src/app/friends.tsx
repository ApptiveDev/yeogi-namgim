import { useFonts } from 'expo-font';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendActivityCard } from '@/components/friends/FriendActivityCard';
import { friendActionStyles as action } from '@/components/friends/friendActionStyles';
import { FriendAddDialog, type FriendAddMode } from '@/components/friends/FriendAddDialog';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHeader, FriendsTitle } from '@/components/friends/FriendsHeader';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/storage';
import { createFriendsMock } from '@/data/friends.mock';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useFriends } from '@/hooks/use-friends';
import type { FriendActivity, FriendProfile } from '@/types/friends';
import { formatActivityTime } from '@/utils/friends';

const FRIENDS_FONTS = {
  [FontFamilies.archivoBlack]: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  [FontFamilies.notoSansKrRegular]: require('../../assets/fonts/NotoSansKR-Regular.otf'),
  [FontFamilies.notoSansKrMedium]: require('../../assets/fonts/NotoSansKR-Medium.otf'),
  [FontFamilies.notoSansKrBold]: require('../../assets/fonts/NotoSansKR-Bold.otf'),
};
const EMPTY_ACTIVITIES: readonly FriendActivity[] = [];

const activityKey = (activity: FriendActivity) => activity.id;

function openCompose() {
  router.dismissTo({ pathname: '/', params: { compose: 'true' } });
}

function useActivityTime(activities: readonly FriendActivity[]) {
  const [now, setNow] = useState(Date.now);

  useFocusEffect(useCallback(() => {
    if (activities.length === 0) return;

    function refreshTime() {
      const next = Date.now();
      // 화면에 보이는 상대 시간 문구가 바뀌는 경우에만 목록을 갱신합니다.
      setNow((previous) => activities.some(({ createdAtMs }) => (
        formatActivityTime(createdAtMs, previous) !== formatActivityTime(createdAtMs, next)
      )) ? next : previous);
    }

    refreshTime();
    const timer = setInterval(refreshTime, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshTime();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [activities]));

  return now;
}

export default function FriendsScreen() {
  const { mockDataEnabled, isReady } = useDeveloperSettings();
  return <FriendsContent key={String(mockDataEnabled)} mockDataEnabled={mockDataEnabled} isReady={isReady} />;
}

function FriendsContent({ mockDataEnabled, isReady }: { mockDataEnabled: boolean; isReady: boolean }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts(FRIENDS_FONTS);
  const [mockData] = useState(() => mockDataEnabled ? createFriendsMock(Date.now()) : null);
  const [showActualFriends, setShowActualFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<FriendAddMode | null>(null);
  const preparing = !isReady || (!fontsLoaded && !fontError);
  const activeMock = showActualFriends ? null : mockData;
  const realFriends = useFriends(isReady && !activeMock);
  const friends = activeMock?.friends ?? realFriends.friends;
  const allActivities = activeMock?.activities ?? EMPTY_ACTIVITIES;
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);
  const activeFriendId = selectedFriend?.id;
  const activities = useMemo(() => activeFriendId
    ? allActivities.filter((activity) => activity.friend.id === activeFriendId)
    : allActivities, [activeFriendId, allActivities]);
  const now = useActivityTime(preparing ? EMPTY_ACTIVITIES : activities);
  const renderActivity = useCallback<ListRenderItem<FriendActivity>>(({ item }) => (
    <FriendActivityCard activity={item} timeLabel={formatActivityTime(item.createdAtMs, now)} />
  ), [now]);
  const hasNoFriends = friends.length === 0 && allActivities.length === 0;
  const showInvitation = hasNoFriends && (activeMock !== null || realFriends.hasLoaded);

  function openAddFriend(mode: FriendAddMode = 'options') {
    setSelectedFriendId(null);
    if (mode === 'create') setShowActualFriends(true);
    setAddMode(mode);
  }

  function closeAddFriend(mode: FriendAddMode) {
    setAddMode(null);
    if (!activeMock && mode !== 'enter') realFriends.reload();
  }

  function showExampleFriends() {
    setShowActualFriends(false);
    setSelectedFriendId(null);
  }

  return (
    <View style={s.screen}>
      <View style={[s.content, { paddingTop: insets.top + 8 }]}>
        <FriendsTitle
          fontsLoaded={fontsLoaded}
          onCreateCode={!preparing && showInvitation ? () => openAddFriend('create') : undefined}
        />
      </View>
      {preparing ? (
        <View style={s.loading}>
          <ActivityIndicator color={C.blue} accessibilityLabel="친구 소식 준비 중" />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={activityKey}
          renderItem={renderActivity}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.content,
            showInvitation && s.emptyContent,
            { paddingTop: showInvitation ? 0 : 16, paddingBottom: insets.bottom + (showInvitation ? 134 : 94) },
          ]}
          ListHeaderComponent={(
            <>
              <FriendsHeader
                friends={friends}
                selectedFriend={selectedFriend}
                onSelectFriend={setSelectedFriendId}
                onAddFriend={() => openAddFriend()}
              />
              {activeMock ? (
                <Text style={s.notice}>예시 친구를 보고 있어요.</Text>
              ) : (
                <ActualFriendsStatus
                  friends={realFriends}
                  onShowExamples={mockDataEnabled ? showExampleFriends : undefined}
                />
              )}
            </>
          )}
          ListEmptyComponent={showInvitation ? (
            <View style={s.invitation}>
              <FriendsEmptyState onEnterCode={() => openAddFriend('enter')} />
            </View>
          ) : hasNoFriends ? null : (
            <EmptyActivityFeed showingExamples={activeMock !== null} selectedFriend={selectedFriend} />
          )}
        />
      )}
      <BottomTabBar selectedTab="friends" onAddPress={openCompose} />
      {addMode ? <FriendAddDialog initialMode={addMode} onClose={closeAddFriend} /> : null}
    </View>
  );
}

function ActualFriendsStatus({ friends, onShowExamples }: {
  friends: ReturnType<typeof useFriends>;
  onShowExamples?: () => void;
}) {
  const loading = !friends.refreshing && (friends.loading || (!friends.hasLoaded && !friends.error));

  return (
    <>
      {onShowExamples ? (
        <View>
          <Text style={s.notice}>실제 친구 목록을 보고 있어요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onShowExamples}
            style={[action.button, action.secondary, action.compact, s.more]}
          >
            <Text style={[action.label, action.compactLabel]}>예시 친구 보기</Text>
          </Pressable>
        </View>
      ) : null}
      <AccountLoadState loading={loading} error={friends.error} label="친구 목록" onRetry={friends.retry} />
      {friends.hasNext && !friends.error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="친구 목록 더 보기"
          disabled={friends.loading}
          onPress={friends.loadMore}
          style={[action.button, action.secondary, action.compact, s.more]}
        >
          <Text style={[action.label, action.compactLabel]}>친구 더 보기</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function EmptyActivityFeed({ showingExamples, selectedFriend }: {
  showingExamples: boolean;
  selectedFriend: FriendProfile | undefined;
}) {
  const message = !showingExamples ? {
    title: '친구 쪽지 소식은 준비 중이에요',
    description: '추가한 친구는 위 목록에서 확인할 수 있어요.',
  } : selectedFriend ? {
    title: '아직 남긴 쪽지가 없어요',
    description: `${selectedFriend.displayName}님이 쪽지를 남기면\n이곳에서 알려드릴게요.`,
  } : {
    title: '아직 친구의 소식이 없어요',
    description: '친구들이 남긴 쪽지를\n이곳에서 만나보세요.',
  };

  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{message.title}</Text>
      <Text style={s.emptyDescription}>{message.description}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  emptyContent: { flexGrow: 1, paddingHorizontal: 23.5 },
  invitation: { flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, marginTop: 12, paddingHorizontal: 20, paddingVertical: 36, gap: 10 },
  emptyTitle: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center' },
  emptyDescription: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 22, color: C.muted, textAlign: 'center' },
  notice: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 4 },
  more: { minHeight: 44, alignSelf: 'center', marginBottom: 12 },
});
