import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { StorageColors as C } from '@/constants/storage';
import type { FriendProfile } from '@/types/friends';

const AVATAR_COLORS = ['#A9B9E8', '#D8B6A4', '#AFC0A4', '#E5C66F', '#BDB0CF', '#A2C5C4'] as const;

export function FriendAvatar({ friend, size, selected = false }: { friend: FriendProfile; size: number; selected?: boolean }) {
  const colorIndex = Array.from(friend.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const stickerSize = Math.round(size * 5 / 7);

  return (
    <View
      style={[s.avatar, {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: friend.sticker?.backgroundColor ?? AVATAR_COLORS[colorIndex],
      }, selected && s.selected]}
      accessible={false}
    >
      {friend.sticker ? <Image
        source={friend.sticker.source}
        contentFit="contain"
        style={{ width: stickerSize, height: stickerSize }}
        accessible={false}
      /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink },
  selected: { borderWidth: 2, borderColor: C.blue },
});
