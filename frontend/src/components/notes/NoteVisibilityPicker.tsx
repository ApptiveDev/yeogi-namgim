import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { NoteCreateRequest } from '@/api/types';

const OPTIONS = [
  { value: 'PUBLIC', label: '공개', description: '전체 공개', icon: require('../../../assets/images/note-compose/visibility-public.svg'), selectedIcon: require('../../../assets/images/note-compose/visibility-public-selected.svg') },
  { value: 'FRIENDS', label: '친구', description: '친구에게만 공개', icon: require('../../../assets/images/note-compose/visibility-friends.svg'), selectedIcon: require('../../../assets/images/note-compose/visibility-friends-selected.svg') },
  { value: 'PRIVATE', label: '나만', description: '나만 보기', icon: require('../../../assets/images/note-compose/visibility-private.svg'), selectedIcon: require('../../../assets/images/note-compose/visibility-private-selected.svg') },
] as const;

export function NoteVisibilityPicker({ value, disabled, onChange }: {
  value: NoteCreateRequest['visibility'];
  disabled: boolean;
  onChange: (value: NoteCreateRequest['visibility']) => void;
}) {
  const index = OPTIONS.findIndex((option) => option.value === value);
  const position = useSharedValue(index * 70);
  useEffect(() => {
    position.set(withTiming(index * 70, { duration: 280, reduceMotion: ReduceMotion.System }));
  }, [index, position]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="쪽지 공개 범위" style={s.row}>
      <View pointerEvents="none" style={s.track} />
      <Animated.View pointerEvents="none" accessible={false} style={[s.indicator, indicatorStyle]} />
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.description}
            accessibilityState={{ checked: selected, disabled }} disabled={disabled}
            onPress={() => onChange(option.value)} style={s.option}>
            <Image source={selected ? option.selectedIcon : option.icon} style={s.icon} accessible={false} contentFit="contain" />
            <Text style={[s.label, selected && s.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { width: 216, height: 44, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: 3, marginBottom: 2 },
  track: { position: 'absolute', top: 4, left: 0, right: 0, height: 34, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(28,28,30,0.92)' },
  indicator: { position: 'absolute', top: 7, left: 3, width: 70, height: 28, borderRadius: 999, backgroundColor: '#D6F65A' },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 2 },
  icon: { width: 12, height: 12 },
  label: { fontFamily: 'NotoSansKR-Bold', fontSize: 12, lineHeight: 18, includeFontPadding: false, color: 'rgba(255,255,255,0.7)' },
  selectedLabel: { color: '#0E0E0E' },
});
