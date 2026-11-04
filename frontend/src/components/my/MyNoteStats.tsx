import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { MY_NOTE_STATS, MyColors as C } from '@/constants/my';
import { formatMyNoteCount } from '@/utils/my-page';

type Props = { written: number | null; saved: number | null };

function openWrittenNotes() {
  router.push('/my-notes');
}

export function MyNoteStats({ written, saved }: Props) {
  const counts = { found: null, written, saved };

  return (
    <View style={s.stats}>
      {MY_NOTE_STATS.map(({ id, label, maximum }, index) => {
        const count = counts[id];
        const opensList = id === 'written';

        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${count === null ? '집계 정보 없음' : `${count}개`}`}
            accessibilityHint={opensList ? '내가 작성한 쪽지 목록으로 이동합니다' : '집계를 준비하고 있어요'}
            disabled={!opensList}
            accessibilityState={{ disabled: !opensList }}
            onPress={opensList ? openWrittenNotes : undefined}
            style={({ pressed }) => [s.stat, index > 0 && s.divider, pressed && s.pressed]}
          >
            <Text style={s.count}>{formatMyNoteCount(count, maximum)}</Text>
            <Text style={s.label}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  stats: { minHeight: 68, paddingVertical: 10, borderRadius: 22, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 3 },
  divider: { borderLeftWidth: 1, borderLeftColor: '#2C2C2E' },
  pressed: { opacity: 0.65 },
  count: { fontFamily: FontFamilies.archivoBlack, fontSize: 24, lineHeight: 29, color: C.surface, includeFontPadding: false },
  label: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 11, lineHeight: 16, color: C.muted, includeFontPadding: false },
});
