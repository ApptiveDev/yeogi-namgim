import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { SettingsFonts as F } from '@/constants/settings';
import { StorageColors as C } from '@/constants/storage';

const OPTIONS = ['전체공개', '친구만', '나만'];
const INDICATOR_ANIMATION = {
  duration: 280,
  easing: Easing.bezier(0.2, 0, 0.2, 1),
  reduceMotion: ReduceMotion.System,
};

export function ProfileVisibilityPicker({ disabled }: { disabled: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const segmentWidth = useSharedValue(0);
  const position = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth.get(),
    transform: [{ translateX: position.get() * segmentWidth.get() }],
  }));

  function select(index: number) {
    setSelectedIndex(index);
    position.set(withTiming(index, INDICATOR_ANIMATION));
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="공개 범위 미리보기" style={s.track}>
      <View style={s.row} onLayout={(event) => segmentWidth.set(event.nativeEvent.layout.width / OPTIONS.length)}>
        <Animated.View pointerEvents="none" accessible={false} style={[s.indicator, indicatorStyle]} />
        {OPTIONS.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }}
              disabled={disabled} onPress={() => select(index)} style={s.option}>
              <Text style={[s.label, selected && s.selectedLabel]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  track: { paddingHorizontal: 3, borderRadius: 999, backgroundColor: C.filterTrack, overflow: 'hidden' },
  row: { flexDirection: 'row', minHeight: 44 },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, zIndex: 1 },
  indicator: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 999, backgroundColor: C.ink},
  label: { fontFamily: F.bold, fontSize: 13, lineHeight: 19, color: C.ink, textAlign: 'center', includeFontPadding: false },
  selectedLabel: { color: C.surface },
});
