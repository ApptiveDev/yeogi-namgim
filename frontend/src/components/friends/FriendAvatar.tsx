import { StyleSheet, View } from 'react-native';

import type { FriendProfile } from '@/types/friends';

const AVATAR_COLORS = ['#A9B9E8', '#D8B6A4', '#AFC0A4', '#E5C66F', '#BDB0CF', '#A2C5C4'] as const;

export function FriendAvatar({ friend, size }: { friend: FriendProfile; size: number }) {
  const colorIndex = Array.from(friend.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % AVATAR_COLORS.length;

  return (
    <View
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[colorIndex] }]}
      accessible={false}
    />
  );
}

const s = StyleSheet.create({
  avatar: { flexShrink: 0 },
});
