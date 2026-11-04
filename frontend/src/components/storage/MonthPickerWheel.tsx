import { useEffect, useRef } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedRef, useAnimatedStyle, useReducedMotion, useScrollOffset, useSharedValue } from 'react-native-reanimated';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { MONTH_PICKER_ROW_HEIGHT as ROW_HEIGHT, MONTH_PICKER_VISIBLE_ROWS, monthPickerIndex } from '@/utils/storage-month-picker';

type Props = {
  label: string;
  values: readonly number[];
  value: number;
  kind: 'year' | 'month';
  format: (value: number, selected: boolean) => string;
  onChange: (value: number) => void;
  onScrollingChange: (scrolling: boolean) => void;
};

const WHEEL_HEIGHT = ROW_HEIGHT * MONTH_PICKER_VISIBLE_ROWS;
const EDGE_PADDING = (WHEEL_HEIGHT - ROW_HEIGHT) / 2;
// 기본값(0.985)과 이전 값(0.995) 사이로 조정해 과도하게 여러 칸 넘어가지 않게 합니다.
const DECELERATION_RATE = Platform.OS === 'android' ? 0.99 : 'normal';

export function MonthPickerWheel({ label, values, value, kind, format, onChange, onScrollingChange }: Props) {
  const scrollRef = useAnimatedRef<ScrollView>();
  const lastReportedRef = useRef(value);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const initializedRef = useRef(false);
  const programmaticTargetRef = useRef<number | null>(null);
  const currentOffsetRef = useRef(selectedIndex * ROW_HEIGHT);
  const scrollOffset = useSharedValue(selectedIndex * ROW_HEIGHT);
  useScrollOffset(scrollRef, scrollOffset);
  const reducedMotion = useReducedMotion();

  function scrollToIndex(index: number) {
    const y = index * ROW_HEIGHT;
    const animated = !reducedMotion && Math.abs(currentOffsetRef.current - y) > 0.5;
    programmaticTargetRef.current = animated ? y : null;
    onScrollingChange(animated);
    scrollRef.current?.scrollTo({ y, animated });
  }

  // 드래그로 보고한 값은 다시 스크롤하지 않아 관성 스크롤을 방해하지 않습니다.
  useEffect(() => {
    if (value === lastReportedRef.current) return;
    lastReportedRef.current = value;
    scrollToIndex(selectedIndex);
  });

  function select(nextIndex: number) {
    const index = Math.max(0, Math.min(values.length - 1, nextIndex));
    const nextValue = values[index];
    lastReportedRef.current = nextValue;
    scrollToIndex(index);
    onChange(nextValue);
  }

  function reportScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offset = event.nativeEvent.contentOffset.y;
    currentOffsetRef.current = offset;
    if (programmaticTargetRef.current !== null) {
      if (Math.abs(offset - programmaticTargetRef.current) <= 0.5) {
        programmaticTargetRef.current = null;
        onScrollingChange(false);
      }
      // '오늘'로 이동하는 동안 중간 행이 목표 값을 덮어쓰지 않도록 합니다.
      return;
    }
    // Web은 드래그/관성 종료 콜백을 제공하지 않습니다.
    if (Platform.OS === 'web') commitOffset(offset);
  }

  function commitOffset(offset: number) {
    const index = monthPickerIndex(offset, values.length);
    const nextValue = values[index];
    if (nextValue === lastReportedRef.current) return;
    lastReportedRef.current = nextValue;
    onChange(nextValue);
  }

  return (
    <View
      style={kind === 'year' ? s.yearColumn : s.monthColumn}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: values[0], max: values[values.length - 1], now: value, text: kind === 'year' ? `${value}년` : `${value}월` }}
      accessibilityActions={[{ name: 'increment', label: '다음 값' }, { name: 'decrement', label: '이전 값' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') select(selectedIndex + 1);
        else if (event.nativeEvent.actionName === 'decrement') select(selectedIndex - 1);
      }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.items}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate={DECELERATION_RATE}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (initializedRef.current) return;
          initializedRef.current = true;
          scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
        }}
        onScroll={reportScroll}
        onScrollBeginDrag={() => { programmaticTargetRef.current = null; onScrollingChange(true); }}
        onScrollEndDrag={(event) => {
          reportScroll(event);
          commitOffset(event.nativeEvent.contentOffset.y);
          onScrollingChange(false);
        }}
        onMomentumScrollBegin={() => onScrollingChange(true)}
        onMomentumScrollEnd={(event) => {
          reportScroll(event);
          commitOffset(event.nativeEvent.contentOffset.y);
          onScrollingChange(false);
        }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {values.map((item, index) => (
            <Pressable key={item} onPress={() => select(index)} style={s.item} accessible={false}>
              <View style={kind === 'year' ? s.yearLabel : s.monthLabel}>
                <WheelLabel index={index} scrollOffset={scrollOffset} text={format(item, false)} selectedText={format(item, true)} />
              </View>
            </Pressable>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function WheelLabel({ index, scrollOffset, text, selectedText }: { index: number; scrollOffset: SharedValue<number>; text: string; selectedText: string }) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(index - Math.round(scrollOffset.get() / ROW_HEIGHT));
    return {
      opacity: distance === 0 ? 1 : distance === 1 ? 0.5 : 0.22,
      transform: [{ scale: distance === 0 ? 1 : distance === 1 ? 15 / 18 : 13 / 18 }],
    };
  });
  const regularStyle = useAnimatedStyle(() => ({
    opacity: index === Math.round(scrollOffset.get() / ROW_HEIGHT) ? 0 : 1,
  }));
  const selectedStyle = useAnimatedStyle(() => ({
    opacity: index === Math.round(scrollOffset.get() / ROW_HEIGHT) ? 1 : 0,
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
  yearColumn: { width: '42.424242%', height: WHEEL_HEIGHT },
  monthColumn: { flex: 1, height: WHEEL_HEIGHT },
  scroll: { flex: 1 },
  items: { paddingVertical: EDGE_PADDING },
  item: { height: ROW_HEIGHT, justifyContent: 'center' },
  yearLabel: { width: '64.285714%', alignSelf: 'flex-end' },
  monthLabel: { width: '92.105263%', alignSelf: 'flex-start' },
  labelFrame: { height: 24 },
  text: { position: 'absolute', left: 0, right: 0, top: 0, fontFamily: F.medium, fontSize: 18, lineHeight: 24, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, color: '#3A3A3C' },
  selected: { fontFamily: F.display, color: C.ink },
});
