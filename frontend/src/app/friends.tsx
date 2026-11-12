import { useFonts } from 'expo-font';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendActivitiesSkeleton, FriendActivityCard } from '@/components/friends/FriendActivityCard';
import { friendActionStyles as action } from '@/components/friends/friendActionStyles';
import { FriendAddDialog, type FriendAddMode } from '@/components/friends/FriendAddDialog';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHeader, FriendsListSkeleton, FriendsTitle } from '@/components/friends/FriendsHeader';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { createFriendsMock } from '@/data/friends.mock';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useFriendActivities, useFriends } from '@/hooks/use-friends';
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
  const showingExamples = activeMock !== null;
  const realFriends = useFriends(isReady && !showingExamples);
  const realActivities = useFriendActivities(isReady && !showingExamples);
  const friends = activeMock?.friends ?? realFriends.friends;
  const allActivities = activeMock?.activities ?? realActivities.activities;
  const friendsLoading = preparing || (!showingExamples && !realFriends.hasLoaded && !realFriends.error);
  const feedLoading = preparing || (!showingExamples && !realActivities.hasLoaded && !realActivities.error);
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);
  const activeFriendId = selectedFriend?.id;
  const activities = useMemo(() => activeFriendId
    ? allActivities.filter((activity) => activity.friend.id === activeFriendId)
    : allActivities, [activeFriendId, allActivities]);
  const now = useActivityTime(preparing ? EMPTY_ACTIVITIES : activities);
  const renderActivity = useCallback<ListRenderItem<FriendActivity>>(({ item }) => (
    <FriendActivityCard activity={item} timeLabel={formatActivityTime(item.createdAtMs, now)} showExamplePreview={showingExamples} />
  ), [now, showingExamples]);
  const feedReady = showingExamples || (realActivities.hasLoaded && !realActivities.error);
  const showInvitation = !preparing && friends.length === 0 && allActivities.length === 0
    && (showingExamples || (realFriends.hasLoaded && realActivities.hasLoaded));

  function reloadActual() {
    realFriends.reload();
    realActivities.reload();
  }

  function openAddFriend(mode: FriendAddMode = 'options') {
    setSelectedFriendId(null);
    setShowActualFriends(true);
    setAddMode(mode);
  }

  function closeAddFriend() {
    setAddMode(null);
    reloadActual();
  }

  function changeFriendsMode(showActual: boolean) {
    setShowActualFriends(showActual);
    setSelectedFriendId(null);
  }

  return (
    <View style={s.screen}>
      <View style={[s.content, { paddingTop: insets.top + 8 }]}>
        <FriendsTitle
          fontsLoaded={fontsLoaded}
          onCreateCode={showInvitation ? () => openAddFriend('create') : undefined}
        />
      </View>
      <FlatList
        data={feedLoading ? EMPTY_ACTIVITIES : activities}
        keyExtractor={activityKey}
        renderItem={renderActivity}
        showsVerticalScrollIndicator={false}
        refreshing={realFriends.refreshing || realActivities.refreshing}
        onRefresh={preparing || showingExamples || (friendsLoading && feedLoading) ? undefined : reloadActual}
        contentContainerStyle={[
          s.content,
          showInvitation && s.emptyContent,
          { paddingTop: showInvitation ? 0 : 16, paddingBottom: insets.bottom + (showInvitation ? 134 : 94) },
        ]}
        ListHeaderComponent={(
          <>
            {friendsLoading ? <FriendsListSkeleton /> : (
              <FriendsHeader
                friends={friends}
                selectedFriend={selectedFriend}
                onSelectFriend={setSelectedFriendId}
                onAddFriend={() => openAddFriend()}
              />
            )}
            {preparing ? null : activeMock ? (
              <View>
                <Text style={s.notice}>예시 친구를 보고 있어요.</Text>
                <Pressable accessibilityRole="button" onPress={() => changeFriendsMode(true)}
                  style={[action.button, action.secondary, action.compact, s.more]}>
                  <Text style={[action.label, action.compactLabel]}>실제 친구 보기</Text>
                </Pressable>
              </View>
            ) : (
              <ActualFriendsStatus
                friends={realFriends}
                onShowExamples={mockDataEnabled ? () => changeFriendsMode(false) : undefined}
              />
            )}
          </>
        )}
        ListEmptyComponent={feedLoading ? <FriendActivitiesSkeleton /> : showInvitation ? (
          <View style={s.invitation}>
            <FriendsEmptyState onEnterCode={() => openAddFriend('enter')} />
          </View>
        ) : feedReady ? (
          <EmptyActivityFeed selectedFriend={selectedFriend} hasMore={realActivities.hasNext} />
        ) : null}
        ListFooterComponent={feedLoading || showingExamples ? null : (
          <ActivityFeedStatus feed={realActivities} />
        )}
      />
      <BottomTabBar selectedTab="friends" onAddPress={openCompose} />
      {addMode ? <FriendAddDialog initialMode={addMode} onClose={closeAddFriend} /> : null}
    </View>
  );
}

function ActualFriendsStatus({ friends, onShowExamples }: {
  friends: ReturnType<typeof useFriends>;
  onShowExamples?: () => void;
}) {
  const loading = friends.hasLoaded && friends.loading && !friends.refreshing;

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
      {friends.hasNext && !loading && !friends.error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="친구 목록 더 보기"
          disabled={friends.refreshing}
          onPress={friends.loadMore}
          style={[action.button, action.secondary, action.compact, s.more]}
        >
          <Text style={[action.label, action.compactLabel]}>친구 더 보기</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function ActivityFeedStatus({ feed }: { feed: ReturnType<typeof useFriendActivities> }) {
  return (
    <>
      <AccountLoadState loading={feed.loading && !feed.refreshing} error={feed.error} label="친구 쪽지 소식" onRetry={feed.retry} />
      {feed.hasNext && !feed.loading && !feed.error ? (
        <Pressable accessibilityRole="button" onPress={feed.loadMore} disabled={feed.refreshing}
          style={[action.button, action.secondary, action.compact, s.more, s.feedMore]}>
          <Text style={[action.label, action.compactLabel]}>소식 더 보기</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function EmptyActivityFeed({ selectedFriend, hasMore }: {
  selectedFriend: FriendProfile | undefined;
  hasMore: boolean;
}) {
  const message = hasMore ? {
    title: '불러온 목록에 친구의 소식이 없어요',
    description: '소식 더 보기를 눌러 다음 소식을 확인해 보세요.',
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
  empty: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, marginTop: 12, paddingHorizontal: 20, paddingVertical: 36, gap: 10 },
  emptyTitle: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center' },
  emptyDescription: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 22, color: C.muted, textAlign: 'center' },
  notice: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 4 },
  more: { minHeight: 44, alignSelf: 'center', marginBottom: 12 },
  feedMore: { marginTop: 12 },
});
