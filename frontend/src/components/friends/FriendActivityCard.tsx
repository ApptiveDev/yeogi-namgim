import { StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import type { FriendActivity } from '@/types/friends';
import { formatActivityTime } from '@/utils/friends';

export function FriendActivityCard({ activity, now }: { activity: FriendActivity; now: number }) {
  const timeLabel = formatActivityTime(activity.createdAt, now);

  return (
    <View style={s.card} accessible>
      <FriendAvatar friend={activity.friend} size={48} />
      <View style={s.content}>
        <Text style={s.message}>
          <Text style={s.name}>{activity.friend.displayName}</Text>님이 쪽지를 남겼어요
        </Text>
        <View style={s.metadata}>
          <Text style={s.location} numberOfLines={1}>{activity.locationLabel}</Text>
          {timeLabel ? <>
            <Text style={s.separator} accessible={false}>·</Text>
            <Text style={s.time}>{timeLabel}</Text>
          </> : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 16, backgroundColor: C.surface, borderRadius: 16, boxShadow: '0px 1px 4px 0px rgba(0, 0, 0, 0.04)' },
  content: { flex: 1, minWidth: 0, gap: 6 },
  message: { fontFamily: F.regular, fontSize: 14, lineHeight: 22, color: C.ink, includeFontPadding: false },
  name: { fontFamily: F.bold },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { flexShrink: 1, fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: '#8E8E93', includeFontPadding: false },
  separator: { fontSize: 12, color: '#C2C2C6' },
  time: { flexShrink: 0, fontFamily: F.medium, fontSize: 12, lineHeight: 18, color: '#8E8E93', includeFontPadding: false },
});
