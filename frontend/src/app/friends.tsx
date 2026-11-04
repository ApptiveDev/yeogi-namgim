import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendActivityCard } from '@/components/friends/FriendActivityCard';
import { friendActionStyles as action } from '@/components/friends/friendActionStyles';
import { FriendAddDialog, type FriendAddMode } from '@/components/friends/FriendAddDialog';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHeader, FriendsTitle } from '@/components/friends/FriendsHeader';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { FRIENDS_RESPONSE, resolveFriendsData } from '@/data/friends';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useFriends } from '@/hooks/use-friends';

const FRIENDS_FONTS = {
  ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
  'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
  'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
};

export default function FriendsScreen() {
  const { mockDataEnabled, isReady } = useDeveloperSettings();
  return <FriendsContent key={String(mockDataEnabled)} mockDataEnabled={mockDataEnabled} isReady={isReady} />;
}

function FriendsContent({ mockDataEnabled, isReady }: { mockDataEnabled: boolean; isReady: boolean }) {
  const insets = useSafeAreaInsets();
  const [showActualFriends, setShowActualFriends] = useState(false);
  const showMock = mockDataEnabled && !showActualFriends;
  const realFriends = useFriends(isReady && !showMock);
  const [fontsLoaded, fontError] = useFonts(FRIENDS_FONTS);
  const preparing = (!fontsLoaded && !fontError) || !isReady;
  const [mockCreatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<FriendAddMode | null>(null);
  const friendsData = showMock
    ? resolveFriendsData(FRIENDS_RESPONSE, true, mockCreatedAt)
    : { friends: realFriends.friends, activities: [] };
  const hasNoFriends = friendsData.friends.length === 0 && friendsData.activities.length === 0;
  const showEmptyState = hasNoFriends && (showMock || realFriends.page >= 0);
  const loadingFriends = !showMock && !realFriends.refreshing && (realFriends.loading || (realFriends.page < 0 && !realFriends.error));
  const selectedFriend = friendsData.friends.find((friend) => friend.id === selectedFriendId);
  const activities = friendsData.activities
    .filter((activity) => !selectedFriend || activity.friend.id === selectedFriend.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  function openAddFriend(mode: FriendAddMode = 'options') {
    setSelectedFriendId(null);
    if (mode === 'create') setShowActualFriends(true);
    setAddMode(mode);
  }

  function closeAddFriend(mode: FriendAddMode) {
    setAddMode(null);
    if (!showMock && mode !== 'enter') realFriends.reload();
  }

  useEffect(() => {
    const refreshTime = () => setNow(Date.now());
    const timer = setInterval(refreshTime, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshTime();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  return (
    <View style={s.screen}>
      <View style={[s.content, { paddingTop: insets.top + 8 }]}>
        <FriendsTitle
          fontsLoaded={fontsLoaded}
          onCreateCode={!preparing && showEmptyState ? () => openAddFriend('create') : undefined}
        />
      </View>
      {preparing ? (
        <View style={s.loading}><ActivityIndicator color={C.blue} accessibilityLabel="친구 소식 준비 중" /></View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(activity) => activity.id}
          renderItem={({ item }) => <FriendActivityCard activity={item} now={now} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.content,
            showEmptyState && s.emptyContent,
            { paddingTop: showEmptyState ? 0 : 16, paddingBottom: insets.bottom + (showEmptyState ? 134 : 94) },
          ]}
          ListHeaderComponent={<>
            <FriendsHeader
              friends={friendsData.friends}
              selectedFriendId={selectedFriend?.id ?? null}
              onSelectFriend={setSelectedFriendId}
              onAddFriend={() => openAddFriend()}
            />
            {showMock ? <Text style={s.notice}>예시 친구를 보고 있어요.</Text> : mockDataEnabled ? <View>
              <Text style={s.notice}>실제 친구 목록을 보고 있어요.</Text>
              <Pressable accessibilityRole="button" onPress={() => { setShowActualFriends(false); setSelectedFriendId(null); }} style={[action.button, action.secondary, action.compact, s.more]}>
                <Text style={[action.label, action.compactLabel]}>예시 친구 보기</Text>
              </Pressable>
            </View> : null}
            {!showMock ? <>
              <AccountLoadState loading={loadingFriends} error={realFriends.error} label="친구 목록" onRetry={realFriends.retry} />
              {realFriends.hasNext && !realFriends.error ? <Pressable accessibilityRole="button" accessibilityLabel="친구 목록 더 보기" disabled={realFriends.loading} onPress={realFriends.loadMore} style={[action.button, action.secondary, action.compact, s.more]}>
                <Text style={[action.label, action.compactLabel]}>친구 더 보기</Text>
              </Pressable> : null}
            </> : null}
          </>}
          ListEmptyComponent={showEmptyState ? <View style={s.invitation}>
            <FriendsEmptyState onEnterCode={() => openAddFriend('enter')} />
          </View> : hasNoFriends ? null : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{!showMock ? '친구 쪽지 소식은 준비 중이에요' : selectedFriend ? '아직 남긴 쪽지가 없어요' : '아직 친구의 소식이 없어요'}</Text>
              <Text style={s.emptyDescription}>
                {!showMock ? '추가한 친구는 위 목록에서 확인할 수 있어요.' : selectedFriend ? `${selectedFriend.displayName}님이 쪽지를 남기면\n이곳에서 알려드릴게요.` : '친구들이 남긴 쪽지를\n이곳에서 만나보세요.'}
              </Text>
            </View>
          )}
        />
      )}
      <BottomTabBar selectedTab="friends" onAddPress={() => router.dismissTo({ pathname: '/', params: { compose: 'true' } })} />
      {addMode ? <FriendAddDialog initialMode={addMode} onClose={closeAddFriend} /> : null}
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
  emptyTitle: { fontFamily: F.bold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center' },
  emptyDescription: { fontFamily: F.regular, fontSize: 13, lineHeight: 22, color: C.muted, textAlign: 'center' },
  notice: { fontFamily: F.regular, fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 4 },
  more: { minHeight: 44, alignSelf: 'center', marginBottom: 12 },
});
