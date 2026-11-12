import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';

import type { MapFilter } from '@/api/types';
import { COMPOSE_DIM_DURATION, COMPOSE_DIM_OPACITY } from '@/components/notes/compose-transitions';
import { styles } from '@/styles/home.styles';

const MAP_FILTERS: readonly { value: MapFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'FRIENDS', label: '친구' },
  { value: 'MINE', label: '내 쪽지' },
  { value: 'SAVED', label: '저장' },
];

type Props = {
  isComposeOpen: boolean;
  selected: MapFilter;
  onSelect: (filter: MapFilter) => void;
  fontsLoaded: boolean;
  fontError: Error | null;
  insets: { top: number; left?: number; right?: number };
};

export function MapSelector({
  isComposeOpen, selected, onSelect, fontsLoaded, fontError, insets,
}: Props) {
  const [selectorShadeOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(selectorShadeOpacity, {
      toValue: isComposeOpen ? COMPOSE_DIM_OPACITY : 0,
      duration: COMPOSE_DIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isComposeOpen, selectorShadeOpacity]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={[styles.mapSelectorContainer, {
      top: insets.top + 19, left: (insets.left ?? 0) + 24, right: (insets.right ?? 0) + 24,
    }]}>
      {MAP_FILTERS.map(({ value, label }) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === value, disabled: isComposeOpen }}
          disabled={isComposeOpen}
          onPress={() => onSelect(value)}
          style={styles.mapFilterButton}
        >
          <View style={[styles.mapFilterChip, selected === value && styles.mapFilterChipSelected]}>
            <Text style={[
              styles.mapSelectorLabel,
              !fontsLoaded && styles.mapSelectorFontFallback,
              selected === value && styles.mapFilterLabelSelected,
            ]}>{label}</Text>
            <Animated.View pointerEvents="none" style={[styles.mapSelectorShade, { opacity: selectorShadeOpacity }]} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
