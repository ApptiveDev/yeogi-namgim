import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, type ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  type DerivedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { useMotionPreference } from '@/hooks/use-motion-preference';
import {
  MONTH_PICKER_ROW_HEIGHT as ROW_HEIGHT,
  MONTH_PICKER_WHEEL_HEIGHT,
  MONTH_PICKER_WHEEL_PADDING,
  monthPickerIndex,
} from '@/utils/storage-month-picker';

type Props = {
  label: string;
  values: readonly number[];
  value: number;
  kind: 'year' | 'month';
  format: (value: number, selected: boolean) => string;
  onChange: (value: number) => void;
  onScrollingChange: (scrolling: boolean) => void;
};

const IS_WEB = Platform.OS === 'web';
const SNAP_TOLERANCE = 1;
const webWheelStyle = { flex: 1, scrollSnapType: 'y mandatory' };
const webRowStyle: ViewStyle & { scrollSnapAlign: string } = { scrollSnapAlign: 'center' };
type ScrollPhase = 'idle' | 'dragging' | 'settling' | { target: number };
type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

export const MonthPickerWheel = memo(function MonthPickerWheel({
  label,
  values,
  value,
  kind,
  format,
  onChange,
  onScrollingChange,
}: Props) {
  const scrollRef = useAnimatedRef<ScrollView>();
  const lastReported = useRef(value);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const [initialOffset] = useState(() => ({ x: 0, y: selectedIndex * ROW_HEIGHT }));
  const currentOffset = useRef(initialOffset.y);
  const phase = useRef<ScrollPhase>('idle');
  const webInitialized = useRef(false);
  const scrollOffset = useSharedValue(initialOffset.y);
  const count = values.length;
  const centeredIndex = useDerivedValue(() => monthPickerIndex(scrollOffset.get(), count));
  const snapOffsets = useMemo(() => values.map((_, index) => index * ROW_HEIGHT), [values]);
  const reduceMotion = useMotionPreference();
  useScrollOffset(scrollRef, scrollOffset);

  const scrollToIndex = useCallback((index: number) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const y = index * ROW_HEIGHT;
    const animated = !reduceMotion && Math.abs(currentOffset.current - y) > SNAP_TOLERANCE;
    phase.current = animated ? { target: y } : 'idle';
    if (!animated) currentOffset.current = y;
    onScrollingChange(animated);
    scroll.scrollTo({ y, animated });
  }, [onScrollingChange, reduceMotion, scrollRef]);

  // '오늘'처럼 바깥에서 바뀐 값만 휠로 반영합니다.
  useLayoutEffect(() => {
    if (value === lastReported.current) return;
    lastReported.current = value;
    scrollToIndex(selectedIndex);
  }, [scrollToIndex, selectedIndex, value]);

  function select(nextIndex: number) {
    const index = Math.max(0, Math.min(values.length - 1, nextIndex));
    commitIndex(index);
    scrollToIndex(index);
  }

  function commitIndex(index: number) {
    const nextValue = values[index];
    if (nextValue === lastReported.current) return;
    lastReported.current = nextValue;
    onChange(nextValue);
  }

  function finishScroll(offset: number) {
    currentOffset.current = offset;
    phase.current = 'idle';
    commitIndex(monthPickerIndex(offset, count));
    onScrollingChange(false);
  }

  function reportScroll({ nativeEvent }: ScrollEvent) {
    const offset = nativeEvent.contentOffset.y;
    currentOffset.current = offset;
    const scrolling = phase.current;
    if (typeof scrolling === 'object') {
      // Android's scrollTo does not emit momentum end, so unlock at the requested row.
      if (Math.abs(offset - scrolling.target) <= SNAP_TOLERANCE) finishScroll(offset);
    } else if (IS_WEB) {
      commitIndex(monthPickerIndex(offset, count));
    }
  }

  function endDrag({ nativeEvent }: ScrollEvent) {
    if (phase.current !== 'dragging') return;
    const offset = nativeEvent.contentOffset.y;
    const target = nativeEvent.targetContentOffset?.y;
    if (Platform.OS === 'ios' && target !== undefined && Math.abs(target - offset) <= SNAP_TOLERANCE) {
      // iOS emits no momentum end if the drag stops at its current position.
      finishScroll(offset);
    } else {
      phase.current = 'settling';
    }
  }

  return (
    <View
      style={kind === 'year' ? s.yearColumn : s.monthColumn}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min: values[0],
        max: values[values.length - 1],
        now: value,
        text: kind === 'year' ? `${value}년` : `${value}월`,
      }}
      accessibilityActions={[{ name: 'increment', label: '다음 값' }, { name: 'decrement', label: '이전 값' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') select(selectedIndex + 1);
        else if (event.nativeEvent.actionName === 'decrement') select(selectedIndex - 1);
      }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        style={IS_WEB ? webWheelStyle : s.scroll}
        contentContainerStyle={s.items}
        contentOffset={IS_WEB ? undefined : initialOffset}
        onContentSizeChange={IS_WEB ? () => {
          if (webInitialized.current) return;
          webInitialized.current = true;
          scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
        } : undefined}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        scrollsToTop={false}
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        snapToOffsets={IS_WEB ? undefined : snapOffsets}
        scrollEventThrottle={16}
        onScroll={reportScroll}
        onScrollBeginDrag={IS_WEB ? undefined : () => {
          phase.current = 'dragging';
          onScrollingChange(true);
        }}
        onScrollEndDrag={IS_WEB ? undefined : endDrag}
        onMomentumScrollBegin={IS_WEB ? undefined : () => {
          if (phase.current !== 'idle') return;
          phase.current = 'settling';
          onScrollingChange(true);
        }}
        onMomentumScrollEnd={IS_WEB ? undefined : ({ nativeEvent }) => {
          if (phase.current === 'settling') finishScroll(nativeEvent.contentOffset.y);
        }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {values.map((item, index) => (
          <Pressable key={item} onPress={() => select(index)} style={[s.item, IS_WEB && webRowStyle]} accessible={false}>
            <View style={kind === 'year' ? s.yearLabel : s.monthLabel}>
              <WheelLabel index={index} centeredIndex={centeredIndex} text={format(item, false)} selectedText={format(item, true)} />
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>
    </View>
  );
});

type WheelLabelProps = {
  index: number;
  centeredIndex: DerivedValue<number>;
  text: string;
  selectedText: string;
};

function WheelLabel({ index, centeredIndex, text, selectedText }: WheelLabelProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(index - centeredIndex.get());
    return {
      opacity: distance === 0 ? 1 : distance === 1 ? 0.5 : 0.22,
      transform: [{ scale: distance === 0 ? 1 : distance === 1 ? 15 / 18 : 13 / 18 }],
    };
  });
  const regularStyle = useAnimatedStyle(() => ({
    opacity: index === centeredIndex.get() ? 0 : 1,
  }));
  const selectedStyle = useAnimatedStyle(() => ({
    opacity: index === centeredIndex.get() ? 1 : 0,
  }));
  // 두 폰트는 미리 배치하고, 중앙 행이 바뀔 때 전환 효과 없이 즉시 교체합니다.
  return (
    <Animated.View style={[s.labelFrame, animatedStyle]} accessible={false}>
      <Animated.Text numberOfLines={1} style={[s.text, regularStyle]} accessible={false}>{text}</Animated.Text>
      <Animated.Text numberOfLines={1} style={[s.text, s.selected, selectedStyle]} accessible={false}>{selectedText}</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  yearColumn: { width: '42.424242%', height: MONTH_PICKER_WHEEL_HEIGHT },
  monthColumn: { flex: 1, height: MONTH_PICKER_WHEEL_HEIGHT },
  scroll: { flex: 1 },
  items: { paddingVertical: MONTH_PICKER_WHEEL_PADDING },
  item: { height: ROW_HEIGHT, justifyContent: 'center' },
  yearLabel: { width: '64.285714%', alignSelf: 'flex-end' },
  monthLabel: { width: '92.105263%', alignSelf: 'flex-start' },
  labelFrame: { height: 24 },
  text: { position: 'absolute', left: 0, right: 0, top: 0, fontFamily: FontFamilies.notoSansKrMedium, fontSize: 18, lineHeight: 24, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, color: '#3A3A3C' },
  selected: { fontFamily: FontFamilies.archivoBlack, color: C.ink },
});
