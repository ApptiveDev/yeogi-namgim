import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendActivityCard } from '@/components/friends/FriendActivityCard';
import { FriendAddDialog } from '@/components/friends/FriendAddDialog';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHeader } from '@/components/friends/FriendsHeader';
import { AccountLoadState } from '@/components/my/AccountLoadState';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { FRIENDS_RESPONSE, resolveFriendsData } from '@/data/friends';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';
import { useFriends } from '@/hooks/use-friends';
import type { Friend } from '@/api/friends';

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
  const [mockCreatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [addMode, setAddMode] = useState<'options' | 'enter'>('options');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const friendsData = showMock
    ? resolveFriendsData(FRIENDS_RESPONSE, true, mockCreatedAt)
    : { friends: realFriends.friends, activities: [] };
  const hasNoFriends = friendsData.friends.length === 0 && friendsData.activities.length === 0;
  const selectedFriend = friendsData.friends.find((friend) => friend.id === selectedFriendId);
  const activities = friendsData.activities
    .filter((activity) => !selectedFriend || activity.friend.id === selectedFriend.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const activeFriendIds = new Set(friendsData.activities.map((activity) => activity.friend.id));

  function openAddFriend(mode: 'options' | 'enter' = 'options') {
    setSuccessMessage(null);
    setSelectedFriendId(null);
    setShowActualFriends(true);
    setAddMode(mode);
    setIsAddFriendOpen(true);
  }

  function closeAddFriend() {
    setIsAddFriendOpen(false);
    realFriends.reload();
  }

  function friendAdded(friend: Friend) {
    setIsAddFriendOpen(false);
    setSelectedFriendId(null);
    setSuccessMessage(`${friend.nickname}님과 친구가 되었어요.`);
    realFriends.reload();
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
      <Stack.Screen options={{ animation: 'none', statusBarStyle: 'dark', contentStyle: { backgroundColor: C.background } }} />
      {(!fontsLoaded && !fontError) || !isReady ? (
        <View style={s.loading}><ActivityIndicator color={C.blue} accessibilityLabel="친구 소식 준비 중" /></View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(activity) => activity.id}
          renderItem={({ item }) => <FriendActivityCard activity={item} now={now} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, hasNoFriends && s.emptyContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 94 }]}
          ListHeaderComponent={<>
            {showMock ? <Text style={s.notice}>예시 친구를 보고 있어요. 친구 추가 시 실제 목록으로 전환해요.</Text> : mockDataEnabled ? <View>
              <Text style={s.notice}>실제 친구 목록을 보고 있어요.</Text>
              <Pressable accessibilityRole="button" onPress={() => { setShowActualFriends(false); setSelectedFriendId(null); setSuccessMessage(null); }} style={s.more}>
                <Text style={s.moreLabel}>예시 친구 보기</Text>
              </Pressable>
            </View> : null}
            {successMessage ? <Text accessibilityLiveRegion="polite" style={s.success}>{successMessage}</Text> : null}
            <FriendsHeader
              friends={friendsData.friends}
              activeFriendIds={activeFriendIds}
              selectedFriendId={selectedFriend?.id ?? null}
              onSelectFriend={setSelectedFriendId}
              onAddFriend={() => openAddFriend()}
            />
            {!showMock ? <>
              <AccountLoadState loading={realFriends.loading} error={realFriends.error} label="친구 목록" onRetry={realFriends.retry} />
              {realFriends.hasNext && !realFriends.loading && !realFriends.error ? <Pressable accessibilityRole="button" accessibilityLabel="친구 목록 더 보기" onPress={realFriends.loadMore} style={s.more}>
                <Text style={s.moreLabel}>친구 더 보기</Text>
              </Pressable> : null}
            </> : null}
          </>}
          ListEmptyComponent={!showMock && (realFriends.loading || realFriends.error) ? null : <View style={hasNoFriends ? s.invitation : s.empty}>
            {hasNoFriends ? <FriendsEmptyState onInvite={() => openAddFriend()} onEnterCode={() => openAddFriend('enter')} /> : <>
              <Text style={s.emptyTitle}>{!showMock ? '친구 쪽지 소식은 준비 중이에요' : selectedFriend ? '아직 남긴 쪽지가 없어요' : '아직 친구의 소식이 없어요'}</Text>
              <Text style={s.emptyDescription}>
                {!showMock ? '추가한 친구는 위 목록에서 확인할 수 있어요.' : selectedFriend ? `${selectedFriend.displayName}님이 쪽지를 남기면\n이곳에서 알려드릴게요.` : '친구들이 남긴 쪽지를\n이곳에서 만나보세요.'}
              </Text>
            </>}
          </View>}
        />
      )}
      <BottomTabBar selectedTab="friends" onAddPress={() => router.dismissTo({ pathname: '/', params: { compose: 'true' } })} />
      {isAddFriendOpen ? <FriendAddDialog initialMode={addMode} onClose={closeAddFriend} onAccepted={friendAdded} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  emptyContent: { flexGrow: 1 },
  invitation: { flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, marginTop: 12, paddingHorizontal: 20, paddingVertical: 36, gap: 10 },
  emptyTitle: { fontFamily: F.bold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center' },
  emptyDescription: { fontFamily: F.regular, fontSize: 13, lineHeight: 22, color: C.muted, textAlign: 'center' },
  notice: { fontFamily: F.regular, fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 12 },
  success: { fontFamily: F.medium, fontSize: 13, lineHeight: 21, color: C.blue, marginTop: 12 },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  moreLabel: { fontFamily: F.bold, fontSize: 13, color: C.blue },
});
