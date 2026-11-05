import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { STORAGE_FILTERS } from '@/constants/storage';
import type { StorageFilter, StorageFilterCounts } from '@/types/storage';

type Props = {
  selected: StorageFilter;
  counts: StorageFilterCounts;
  onSelect: (filter: StorageFilter) => void;
};

type TabLayout = { x: number; width: number };
type TabMeasurements = { slot?: TabLayout; content?: TabLayout };
type TrackSize = 'regular' | 'compact' | 'narrow';

const INDICATOR_EXTRA_PADDING = 2;

const INDICATOR_ANIMATION = {
  duration: 280,
  easing: Easing.bezier(0.2, 0, 0.2, 1),
  reduceMotion: ReduceMotion.System,
};

export function StorageFilters({ selected, counts, onSelect }: Props) {
  const [trackSize, setTrackSize] = useState<TrackSize>('regular');
  const measurements = useRef<Partial<Record<StorageFilter, TabMeasurements>>>({});
  const selectedTab = useRef(selected);
  const indicatorTarget = useRef<TabLayout | null>(null);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const narrow = trackSize === 'narrow';

  const syncIndicator = useCallback((id: StorageFilter) => {
    const layout = measurements.current[id];
    if (!layout?.slot || !layout.content) return;

    // 실제 묶음 양옆에 2px씩 여유를 더하며, 탭 배치에는 영향을 주지 않습니다.
    const x = layout.slot.x + layout.content.x - INDICATOR_EXTRA_PADDING;
    const width = layout.content.width + INDICATOR_EXTRA_PADDING * 2;
    const previous = indicatorTarget.current;
    if (previous?.x === x && previous.width === width) return;

    indicatorTarget.current = { x, width };
    if (!previous) {
      indicatorX.set(x);
      indicatorWidth.set(width);
      return;
    }
    indicatorX.set(withTiming(x, INDICATOR_ANIMATION));
    indicatorWidth.set(withTiming(width, INDICATOR_ANIMATION));
  }, [indicatorX, indicatorWidth]);

  useLayoutEffect(() => {
    selectedTab.current = selected;
    syncIndicator(selected);
  }, [selected, syncIndicator]);

  const indicatorStyle = useAnimatedStyle(() => {
    const width = indicatorWidth.get();
    return {
      width,
      opacity: width > 0 ? 1 : 0,
      transform: [{ translateX: indicatorX.get() }],
    };
  });

  function measureTrack(event: LayoutChangeEvent) {
    const { width } = event.nativeEvent.layout;
    if (width < 314) setTrackSize('narrow');
    else if (width < 338) setTrackSize('compact');
    else setTrackSize('regular');
  }

  function measureTab(id: StorageFilter, part: keyof TabMeasurements, event: LayoutChangeEvent) {
    const { x, width } = event.nativeEvent.layout;
    const layout = measurements.current[id];
    const previous = layout?.[part];
    if (previous?.x === x && previous.width === width) return;

    measurements.current[id] = { ...layout, [part]: { x, width } };
    if (id === selectedTab.current) syncIndicator(id);
  }

  return (
    <View style={s.track} accessibilityRole="tablist" onLayout={measureTrack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.row}>
        <Animated.View pointerEvents="none" accessible={false} style={[s.indicator, indicatorStyle]} />
        {STORAGE_FILTERS.map(({ id, label }) => {
          const active = selected === id;
          const count = counts[id];
          const maxCount = id === 'all' ? 999 : 99;
          const countLabel = count > maxCount ? `${maxCount}+` : String(count);
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={`${label}, ${count}개`}
              accessibilityState={{ selected: active }}
              onLayout={(event) => measureTab(id, 'slot', event)}
              onPress={() => onSelect(id)}
              style={({ pressed }) => [s.tabSlot, pressed && s.pressed]}
            >
              <View
                onLayout={(event) => measureTab(id, 'content', event)}
                style={[s.filterContent, trackSize === 'compact' && s.compactFilter, narrow && s.narrowFilter]}
              >
                <Text numberOfLines={1} style={[s.label, active && s.activeText]}>{label}</Text>
                <View style={[s.badge, narrow && s.narrowBadge, active && s.activeBadge]}>
                  <Text numberOfLines={1} style={[s.count, active && s.activeText]}>{countLabel}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  track: { width: '100%', aspectRatio: 345 / 33, backgroundColor: C.filterTrack, borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  scroll: { flex: 1 },
  // 345×33 시안 기준: 안쪽 여백 3, 선택 표시 높이 27, 배지 높이 17.
  // 남는 폭은 클릭 영역에서만 나누고, 인디케이터 안쪽 여백에는 더하지 않습니다.
  row: { flexGrow: 1, height: '100%', flexDirection: 'row', justifyContent: 'flex-start', columnGap: 0, padding: 3, position: 'relative' },
  tabSlot: { flexGrow: 1, flexShrink: 0, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  filterContent: { flexShrink: 0, height: '100%', paddingLeft: 10, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 13.5 },
  compactFilter: { paddingLeft: 6, paddingRight: 2, gap: 3 },
  narrowFilter: { paddingLeft: 4, paddingRight: 1, gap: 1 },
  indicator: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 999, backgroundColor: C.blue, boxShadow: '0 3px 8px rgba(35, 80, 255, 0.3)' },
  label: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 13, lineHeight: 19, color: '#2C2C2E', textAlignVertical: 'center', includeFontPadding: false },
  badge: { minWidth: 20, flexShrink: 0, height: 17, paddingHorizontal: 4, borderRadius: 8.5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  narrowBadge: { paddingHorizontal: 2 },
  activeBadge: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  count: { fontFamily: FontFamilies.interSemiBold, color: '#2C2C2E', fontSize: 11, lineHeight: 15, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  activeText: { color: C.surface },
  pressed: { opacity: 0.75 },
});
