import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import type { FriendProfile } from '@/types/friends';

type Props = {
  friends: readonly FriendProfile[];
  activeFriendIds: ReadonlySet<string>;
  selectedFriendId: string | null;
  onSelectFriend: (id: string | null) => void;
  onAddFriend: () => void;
};

export function FriendsHeader({ friends, activeFriendIds, selectedFriendId, onSelectFriend, onAddFriend }: Props) {
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);

  return (
    <View>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>FRIENDS</Text>
      </View>
      <View style={s.stories}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="친구 추가"
          accessibilityHint="친구 추가 창을 엽니다"
          onPress={onAddFriend}
          style={({ pressed }) => [s.profile, pressed && s.pressed]}
        >
          <View style={s.addCircle}>
            <Text style={s.plus} accessible={false}>+</Text>
          </View>
          <Text style={s.addLabel}>추가</Text>
        </Pressable>
        {friends.length > 0 ? <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          alwaysBounceHorizontal={false}
          style={s.friendStories}
          contentContainerStyle={s.profiles}
        >
          {friends.map((friend) => {
            const selected = friend.id === selectedFriendId;
            const hasActivity = activeFriendIds.has(friend.id);
            return (
              <Pressable
                key={friend.id}
                accessibilityRole="button"
                accessibilityLabel={`${friend.displayName}님의 소식`}
                accessibilityHint={selected ? '다시 누르면 모든 친구의 소식을 볼 수 있어요' : '이 친구가 남긴 쪽지 소식을 볼 수 있어요'}
                accessibilityState={{ selected }}
                onPress={() => onSelectFriend(selected ? null : friend.id)}
                style={({ pressed }) => [s.profile, pressed && s.pressed]}
              >
                <View style={[s.ring, hasActivity && s.activeRing, selected && s.selectedRing]}>
                  <FriendAvatar friend={friend} size={60} />
                </View>
                <Text numberOfLines={1} style={[s.name, selected && s.selectedName]}>{friend.displayName}</Text>
              </Pressable>
            );
          })}
        </ScrollView> : null}
      </View>
      {friends.length > 0 ? <View style={s.feedHeading}>
        <Text accessibilityRole="header" style={s.feedTitle}>
          {selectedFriend ? `${selectedFriend.displayName}님의 소식` : '최근 소식'}
        </Text>
        {selectedFriend ? <Pressable
          onPress={() => onSelectFriend(null)}
          accessibilityRole="button"
          accessibilityLabel="모든 친구의 소식 보기"
          style={s.reset}
        >
          <Text style={s.resetLabel}>전체 보기</Text>
        </Pressable> : null}
      </View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 18, paddingBottom: 24 },
  title: { fontFamily: F.display, fontSize: 30, lineHeight: 64, color: C.ink, letterSpacing: -2, includeFontPadding: false },
  addCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lime },
  plus: { fontSize: 34, lineHeight: 40, color: C.ink, includeFontPadding: false },
  addLabel: { fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  stories: { flexDirection: 'row', gap: 16, marginRight: -24, paddingBottom: 26 },
  friendStories: { flex: 1 },
  profiles: { gap: 16, paddingRight: 24 },
  profile: { width: 70, flexShrink: 0, alignItems: 'center', gap: 8 },
  ring: { width: 70, height: 70, padding: 3, borderRadius: 35, borderWidth: 2, borderColor: '#DCDCD9', alignItems: 'center', justifyContent: 'center' },
  activeRing: { borderColor: C.blue },
  selectedRing: { borderColor: C.ink, backgroundColor: C.lime },
  name: { maxWidth: '100%', fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  selectedName: { fontFamily: F.bold, color: C.blue },
  pressed: { opacity: 0.65 },
  feedHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#E6E6E2', paddingTop: 16, marginBottom: 4 },
  feedTitle: { flex: 1, fontFamily: F.bold, fontSize: 14, lineHeight: 22, color: C.ink, includeFontPadding: false },
  reset: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  resetLabel: { fontFamily: F.medium, fontSize: 12, color: C.blue },
});
