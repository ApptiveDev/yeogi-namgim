import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import type { FriendActivity } from '@/types/friends';
import { formatActivityTime } from '@/utils/friends';

export function FriendActivityCard({ activity, now }: { activity: FriendActivity; now: number }) {
  const timeLabel = formatActivityTime(activity.createdAt, now);

  return (
    <View style={s.card}>
      <View style={s.header} accessible>
        <FriendAvatar friend={activity.friend} size={34} />
        <View style={s.content}>
          <Text style={s.message}>{activity.friend.displayName}님이 쪽지를 남겼어요</Text>
          <View style={s.metadata}>
            <ComposeIcon name="location" size={12} color="#F23527" />
            <Text style={s.location} numberOfLines={1}>{activity.locationLabel}</Text>
            {timeLabel ? <>
              <Text style={s.time} accessible={false}>·</Text>
              <Text style={s.time}>{timeLabel}</Text>
            </> : null}
          </View>
        </View>
      </View>
      <View style={s.preview}>
        <Image
          source={require('../../../assets/images/friends-note-preview.png')}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          accessible={false}
        />
        <View style={s.locationPill} accessible accessibilityLabel="지도에서 위치 보기 준비 중">
          <ComposeIcon name="lock" size={12} color={C.lime} />
          <Text style={s.locationPillLabel}>눌러서 지도에서 위치 보기</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12, marginTop: 12, padding: 14, backgroundColor: C.surface, borderRadius: 22, boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.06)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { flex: 1, minWidth: 0 },
  message: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, color: C.ink, includeFontPadding: false },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { flexShrink: 1, fontFamily: F.medium, fontSize: 11, lineHeight: 14, color: '#8E8E93', includeFontPadding: false },
  time: { flexShrink: 0, fontFamily: F.medium, fontSize: 11, lineHeight: 14, color: '#8E8E93', includeFontPadding: false },
  preview: { minHeight: 122, borderRadius: 14, backgroundColor: '#EEE6D3', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 10 },
  locationPill: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, backgroundColor: C.ink },
  locationPillLabel: { flexShrink: 1, fontFamily: F.bold, fontSize: 11, lineHeight: 17, color: C.surface, includeFontPadding: false },
});
