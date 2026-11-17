import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonBlock } from '@/components/ui/skeleton';
import { FontFamilies } from '@/constants/fonts';
import { Palette, ScreenColors as C } from '@/constants/colors';
import { MY_NOTE_STATS } from '@/constants/my';
import { formatMyNoteCount } from '@/utils/my-page';

type Props = { written: number | null; saved: number | null };

function openWrittenNotes() {
  router.push('/my-notes');
}

export const MyNoteStats = memo(function MyNoteStats({ written, saved }: Props) {
  const counts = { found: null, written, saved };

  return (
    <View style={s.stats}>
      {MY_NOTE_STATS.map(({ id, label, maximum }, index) => (
        <MyNoteStat key={id} count={counts[id]} label={label} maximum={maximum} opensList={id === 'written'} hasDivider={index > 0} />
      ))}
    </View>
  );
});

const MyNoteStat = memo(function MyNoteStat({ count, label, maximum, opensList, hasDivider }: {
  count: number | null;
  label: string;
  maximum: number;
  opensList: boolean;
  hasDivider: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${count === null ? '집계 정보 없음' : `${count}개`}`}
      accessibilityHint={opensList ? '내가 작성한 쪽지 목록으로 이동합니다' : '집계를 준비하고 있어요'}
      disabled={!opensList}
      accessibilityState={{ disabled: !opensList }}
      onPress={opensList ? openWrittenNotes : undefined}
      style={({ pressed }) => [s.stat, hasDivider && s.divider, pressed && s.pressed]}
    >
      <Text style={s.count}>{formatMyNoteCount(count, maximum)}</Text>
      <Text style={s.label}>{label}</Text>
    </Pressable>
  );
});

export function MyNoteStatsSkeleton() {
  return (
    <Skeleton label="활동 통계" style={s.stats}>
      {MY_NOTE_STATS.map(({ id }, index) => (
        <View key={id} style={[s.stat, s.placeholderStat, index > 0 && s.divider]}>
          <SkeletonBlock style={[s.placeholder, { width: 26, height: 22 }]} />
          <SkeletonBlock style={[s.placeholder, { width: '65%', height: 11 }]} />
        </View>
      ))}
    </Skeleton>
  );
}

const s = StyleSheet.create({
  stats: { minHeight: 68, paddingVertical: 10, borderRadius: 22, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 3 },
  placeholderStat: { minHeight: 47 },
  placeholder: { backgroundColor: Palette.neutral.gray600 },
  divider: { borderLeftWidth: 1, borderLeftColor: '#2C2C2E' },
  pressed: { opacity: 0.65 },
  count: { fontFamily: FontFamilies.archivoBlack, fontSize: 24, lineHeight: 29, color: C.surface, includeFontPadding: false },
  label: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 16, color: C.muted, includeFontPadding: false },
});
