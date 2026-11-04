import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import type { FriendProfile } from '@/types/friends';

import { friendActionStyles as action } from './friendActionStyles';

type Props = {
  friends: readonly FriendProfile[];
  selectedFriendId: string | null;
  onSelectFriend: (id: string | null) => void;
  onAddFriend: () => void;
};

export function FriendsTitle({ fontsLoaded, onCreateCode }: { fontsLoaded: boolean; onCreateCode?: () => void }) {
  return (
    <View style={s.titleRow}>
      <Text accessibilityRole="header" style={[s.title, fontsLoaded ? s.displayFont : s.fallbackFont]}>FRIENDS</Text>
      {onCreateCode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="초대 코드 생성"
          hitSlop={6}
          onPress={onCreateCode}
          style={({ pressed }) => [action.button, action.primary, action.compact, s.createCode, pressed && s.pressed]}
        >
          <Image
            source={require('../../../assets/images/friends-code-plus.svg')}
            style={s.createCodeIcon}
            contentFit="contain"
            accessible={false}
          />
          <Text style={[action.label, action.compactLabel, action.iconLabel]}>코드생성</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FriendsHeader({ friends, selectedFriendId, onSelectFriend, onAddFriend }: Props) {
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);

  return (
    <View>
      {friends.length > 0 ? <View style={s.stories}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          alwaysBounceHorizontal={false}
          contentContainerStyle={s.profiles}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="친구 추가"
            accessibilityHint="친구 추가 창을 엽니다"
            onPress={onAddFriend}
            style={({ pressed }) => [s.profile, pressed && s.pressed]}
          >
            <View style={[s.addCircle, action.secondary]}>
              <Image
                source={require('../../../assets/images/tabIcons/add.svg')}
                style={s.addIcon}
                contentFit="contain"
                accessible={false}
              />
            </View>
            <Text style={s.addLabel}>친구 추가</Text>
          </Pressable>
          {friends.map((friend) => {
            const selected = friend.id === selectedFriendId;
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
                <View>
                  <FriendAvatar friend={friend} size={56} selected={selected} />
                  {friend.hasNewActivity ? <View style={s.activityDot} /> : null}
                </View>
                <Text numberOfLines={1} style={[s.name, selected && s.selectedName]}>{friend.displayName}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View> : null}
      {selectedFriend ? <View style={s.feedHeading}>
        <Text accessibilityRole="header" style={s.feedTitle}>
          {selectedFriend.displayName}님의 소식
        </Text>
        <Pressable
          onPress={() => onSelectFriend(null)}
          accessibilityRole="button"
          accessibilityLabel="모든 친구의 소식 보기"
          style={s.reset}
        >
          <Text style={s.resetLabel}>전체 보기</Text>
        </Pressable>
      </View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  titleRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 30, lineHeight: 36, color: C.ink, includeFontPadding: false, flexShrink: 1 },
  displayFont: { fontFamily: F.display },
  fallbackFont: { fontWeight: '900' },
  createCode: { minWidth: 90 },
  createCodeIcon: { width: 10, height: 10 },
  addCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: 28, height: 28 },
  addLabel: { fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  stories: { marginRight: -24, paddingBottom: 4 },
  profiles: { gap: 16, paddingRight: 24 },
  profile: { width: 56, flexShrink: 0, alignItems: 'center', gap: 4 },
  activityDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.background, backgroundColor: '#F23527' },
  name: { maxWidth: '100%', fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  selectedName: { fontFamily: F.bold, color: C.blue },
  pressed: { opacity: 0.65 },
  feedHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  feedTitle: { flex: 1, fontFamily: F.bold, fontSize: 14, lineHeight: 22, color: C.ink, includeFontPadding: false },
  reset: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  resetLabel: { fontFamily: F.medium, fontSize: 12, color: C.blue },
});
