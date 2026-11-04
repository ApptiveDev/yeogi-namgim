import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MY_NOTE_STATS, MyColors as C, MyFonts as F } from '@/constants/my';
import type { MyPageModel } from '@/types/my';
import { formatMyNoteCount } from '@/utils/my-page';

export function MyNoteStats({ counts }: { counts: MyPageModel['noteCounts'] }) {
  return (
    <View style={s.stats}>
      {MY_NOTE_STATS.map(({ id, label, maximum }, index) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${counts[id] === null ? '집계 정보 없음' : `${counts[id]}개`}`}
          accessibilityHint={id === 'written' ? '내가 작성한 쪽지 목록으로 이동합니다' : '집계를 준비하고 있어요'}
          disabled={id !== 'written'}
          accessibilityState={{ disabled: id !== 'written' }}
          onPress={() => router.push('/my-notes')}
          style={({ pressed }) => [s.stat, index > 0 && s.divider, pressed && s.pressed]}
        >
          <Text style={s.count}>{formatMyNoteCount(counts[id], maximum)}</Text>
          <Text style={s.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  stats: { minHeight: 68, paddingVertical: 10, borderRadius: 22, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 3 },
  divider: { borderLeftWidth: 1, borderLeftColor: '#2C2C2E' },
  pressed: { opacity: 0.65 },
  count: { fontFamily: F.display, fontSize: 24, lineHeight: 29, color: C.surface, includeFontPadding: false },
  label: { fontFamily: F.regular, fontSize: 11, lineHeight: 16, color: C.muted, includeFontPadding: false },
});
