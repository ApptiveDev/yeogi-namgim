import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { StorageColors as C } from '@/constants/colors';
import type { FriendProfile } from '@/types/friends';

const AVATAR_COLORS = ['#A9B9E8', '#D8B6A4', '#AFC0A4', '#E5C66F', '#BDB0CF', '#A2C5C4'] as const;

function avatarColor(id: string) {
  let total = 0;
  for (const character of id) total += character.charCodeAt(0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

export function FriendAvatar({ friend, size, selected = false }: { friend: FriendProfile; size: number; selected?: boolean }) {
  const { id, sticker } = friend;
  const stickerSize = Math.round(size * 5 / 7);

  return (
    <View
      style={[s.avatar, {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: sticker?.backgroundColor ?? avatarColor(id),
      }, selected && s.selected]}
      accessible={false}
    >
      {sticker ? (
        <Image
          source={sticker.source}
          contentFit="contain"
          style={{ width: stickerSize, height: stickerSize }}
          accessible={false}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.ink },
  selected: { borderWidth: 2, borderColor: C.blue },
});
