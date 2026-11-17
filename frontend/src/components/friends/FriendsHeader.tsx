import { Image } from 'expo-image';
import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import type { FriendProfile } from '@/types/friends';

import { friendActionStyles as action } from './friendActionStyles';

type Props = {
  friends: readonly FriendProfile[];
  selectedFriend: FriendProfile | undefined;
  onSelectFriend: (id: string | null) => void;
  onAddFriend: () => void;
};

const PROFILE_SIZE = 56;
const PROFILE_GAP = 16;
const friendKey = (friend: FriendProfile) => friend.id;

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

export function FriendsHeader({ friends, selectedFriend, onSelectFriend, onAddFriend }: Props) {
  const selectedFriendId = selectedFriend?.id;

  return (
    <View>
      {friends.length > 0 ? (
        <View style={s.stories}>
          <FlatList
            horizontal
            data={friends}
            extraData={selectedFriendId}
            keyExtractor={friendKey}
            showsHorizontalScrollIndicator={false}
            alwaysBounceHorizontal={false}
            contentContainerStyle={s.profiles}
            ItemSeparatorComponent={ProfileSeparator}
            ListHeaderComponentStyle={s.addProfile}
            ListHeaderComponent={(
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
            )}
            renderItem={({ item }) => (
              <FriendProfileButton
                friend={item}
                selected={item.id === selectedFriendId}
                onSelectFriend={onSelectFriend}
              />
            )}
          />
        </View>
      ) : null}
      {selectedFriend ? (
        <View style={s.feedHeading}>
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
        </View>
      ) : null}
    </View>
  );
}

export function FriendsListSkeleton() {
  return (
    <Skeleton label="친구 목록" style={[s.stories, s.profilePlaceholders]}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <View key={index} style={s.profile}>
          <SkeletonBlock style={s.addCircle} />
          <View style={s.namePlaceholder}>
            <SkeletonBlock style={{ width: 42, height: 10 }} />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

function ProfileSeparator() {
  return <View style={s.profileSeparator} />;
}

type ProfileButtonProps = {
  friend: FriendProfile;
  selected: boolean;
  onSelectFriend: Props['onSelectFriend'];
};

const FriendProfileButton = memo(function FriendProfileButton({ friend, selected, onSelectFriend }: ProfileButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.displayName}님의 소식`}
      accessibilityHint={selected ? '다시 누르면 모든 친구의 소식을 볼 수 있어요' : '이 친구가 남긴 쪽지 소식을 볼 수 있어요'}
      accessibilityState={{ selected }}
      onPress={() => onSelectFriend(selected ? null : friend.id)}
      style={({ pressed }) => [s.profile, pressed && s.pressed]}
    >
      <View>
        <FriendAvatar friend={friend} size={PROFILE_SIZE} selected={selected} />
        {friend.hasNewActivity ? <View style={s.activityDot} /> : null}
      </View>
      <Text numberOfLines={1} style={[s.name, selected && s.selectedName]}>{friend.displayName}</Text>
    </Pressable>
  );
});

const s = StyleSheet.create({
  titleRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 30, lineHeight: 36, color: C.ink, includeFontPadding: false, flexShrink: 1 },
  displayFont: { fontFamily: FontFamilies.archivoBlack },
  fallbackFont: { fontWeight: '900' },
  createCode: { minWidth: 90 },
  createCodeIcon: { width: 10, height: 10 },
  addCircle: { width: PROFILE_SIZE, height: PROFILE_SIZE, borderRadius: PROFILE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: 28, height: 28 },
  addLabel: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  stories: { marginRight: -24, paddingBottom: 4 },
  profilePlaceholders: { flexDirection: 'row', gap: PROFILE_GAP, overflow: 'hidden' },
  profiles: { paddingRight: 24 },
  addProfile: { marginEnd: PROFILE_GAP },
  profileSeparator: { width: PROFILE_GAP },
  profile: { width: PROFILE_SIZE, flexShrink: 0, alignItems: 'center', gap: 4 },
  activityDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.background, backgroundColor: '#F23527' },
  name: { maxWidth: '100%', fontFamily: FontFamilies.notoSansKrBold, fontSize: 12, lineHeight: 18, color: C.ink, includeFontPadding: false },
  namePlaceholder: { height: 18, justifyContent: 'center' },
  selectedName: { fontFamily: FontFamilies.notoSansKrBold, color: C.blue },
  pressed: { opacity: 0.65 },
  feedHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  feedTitle: { flex: 1, fontFamily: FontFamilies.notoSansKrBold, fontSize: 14, lineHeight: 22, color: C.ink, includeFontPadding: false },
  reset: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  resetLabel: { fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, color: C.blue },
});
