import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendActivityCard } from '@/components/friends/FriendActivityCard';
import { FriendAddDialog } from '@/components/friends/FriendAddDialog';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHeader } from '@/components/friends/FriendsHeader';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { FRIENDS_RESPONSE, resolveFriendsData } from '@/data/friends';
import { useDeveloperSettings } from '@/hooks/use-developer-settings';

const FRIENDS_FONTS = {
  ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
  'NotoSansKR-Regular': require('../../assets/fonts/NotoSansKR-Regular.otf'),
  'NotoSansKR-Medium': require('../../assets/fonts/NotoSansKR-Medium.otf'),
  'NotoSansKR-Bold': require('../../assets/fonts/NotoSansKR-Bold.otf'),
};

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { mockDataEnabled, isReady } = useDeveloperSettings();
  const [fontsLoaded, fontError] = useFonts(FRIENDS_FONTS);
  const [mockCreatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const friendsData = resolveFriendsData(FRIENDS_RESPONSE, mockDataEnabled, mockCreatedAt);
  const hasNoFriends = friendsData.friends.length === 0 && friendsData.activities.length === 0;
  const selectedFriend = friendsData.friends.find((friend) => friend.id === selectedFriendId);
  const activities = friendsData.activities
    .filter((activity) => !selectedFriend || activity.friend.id === selectedFriend.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const activeFriendIds = new Set(friendsData.activities.map((activity) => activity.friend.id));

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
          ListHeaderComponent={<FriendsHeader
            friends={friendsData.friends}
            activeFriendIds={activeFriendIds}
            selectedFriendId={selectedFriend?.id ?? null}
            onSelectFriend={setSelectedFriendId}
            onAddFriend={() => setIsAddFriendOpen(true)}
          />}
          ListEmptyComponent={<View style={hasNoFriends ? s.invitation : s.empty}>
            {hasNoFriends ? <FriendsEmptyState /> : <>
              <Text style={s.emptyTitle}>{selectedFriend ? '아직 남긴 쪽지가 없어요' : '아직 친구의 소식이 없어요'}</Text>
              <Text style={s.emptyDescription}>
                {selectedFriend ? `${selectedFriend.displayName}님이 쪽지를 남기면\n이곳에서 알려드릴게요.` : '친구들이 남긴 쪽지를\n이곳에서 만나보세요.'}
              </Text>
            </>}
          </View>}
        />
      )}
      <BottomTabBar selectedTab="friends" onAddPress={() => router.navigate({ pathname: '/', params: { compose: 'true' } })} />
      {isAddFriendOpen ? <FriendAddDialog onClose={() => setIsAddFriendOpen(false)} /> : null}
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
});
