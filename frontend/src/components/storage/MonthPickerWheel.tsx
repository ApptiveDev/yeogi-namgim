import { useEffect, useRef } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation, Easing, type SharedValue, useAnimatedRef, useAnimatedStyle,
  useReducedMotion, useScrollOffset, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { MONTH_PICKER_ROW_HEIGHT as ROW_HEIGHT, MONTH_PICKER_SPRING, MONTH_PICKER_VISIBLE_ROWS, monthPickerIndex, monthPickerRelease } from '@/utils/storage-month-picker';

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
const IS_WEB = Platform.OS === 'web';
const JUMP_ANIMATION = { duration: 240, easing: Easing.out(Easing.cubic) };

export function MonthPickerWheel({ label, values, value, kind, format, onChange, onScrollingChange }: Props) {
  const scrollRef = useAnimatedRef<ScrollView>();
  const lastReportedRef = useRef(value);
  const selectedIndex = Math.max(0, values.indexOf(value));
  const initializedRef = useRef(false);
  const programmaticTargetRef = useRef<number | null>(null);
  const currentOffsetRef = useRef(selectedIndex * ROW_HEIGHT);
  const scrollOffset = useSharedValue(selectedIndex * ROW_HEIGHT);
  const previousTranslationY = useSharedValue(0);
  const maxOffset = (values.length - 1) * ROW_HEIGHT;
  useScrollOffset(IS_WEB ? scrollRef : null, scrollOffset);
  const reducedMotion = useReducedMotion();

  function scrollToIndex(index: number) {
    const y = index * ROW_HEIGHT;
    if (!IS_WEB) {
      onScrollingChange(true);
      scrollOffset.set(withTiming(y, JUMP_ANIMATION, (finished) => {
        if (finished) scheduleOnRN(onScrollingChange, false);
      }));
      return;
    }
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
    commitIndex(monthPickerIndex(offset, values.length));
  }

  function commitIndex(index: number) {
    const nextValue = values[index];
    if (nextValue === lastReportedRef.current) return;
    lastReportedRef.current = nextValue;
    onChange(nextValue);
  }

  function finishGesture(index: number) {
    commitIndex(index);
    onScrollingChange(false);
  }

  const pan = Gesture.Pan()
    .activeOffsetY([-4, 4])
    .failOffsetX([-16, 16])
    .maxPointers(1)
    .onStart(({ translationY }) => {
      cancelAnimation(scrollOffset);
      previousTranslationY.set(translationY);
      scheduleOnRN(onScrollingChange, true);
    })
    .onUpdate(({ translationY }) => {
      const deltaY = translationY - previousTranslationY.get();
      previousTranslationY.set(translationY);
      scrollOffset.set(Math.max(0, Math.min(maxOffset, scrollOffset.get() - deltaY)));
    })
    .onEnd(({ velocityY }, success) => {
      const { index, springVelocity } = monthPickerRelease(scrollOffset.get(), success ? -velocityY : 0, values.length);
      scrollOffset.set(withSpring(index * ROW_HEIGHT, { ...MONTH_PICKER_SPRING, velocity: springVelocity }, (finished) => {
        if (finished) scheduleOnRN(finishGesture, index);
      }));
    });

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollOffset.get() }] }));
  const items = values.map((item, index) => (
    <Pressable key={item} onPress={() => select(index)} style={s.item} accessible={false}>
      <View style={kind === 'year' ? s.yearLabel : s.monthLabel}>
        <WheelLabel index={index} scrollOffset={scrollOffset} text={format(item, false)} selectedText={format(item, true)} />
      </View>
    </Pressable>
  ));

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
      {IS_WEB ? (
        <Animated.ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.items}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (initializedRef.current) return;
            initializedRef.current = true;
            scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
          }}
          onScroll={reportScroll}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {items}
        </Animated.ScrollView>
      ) : (
        <GestureDetector gesture={pan}>
          <View style={s.viewport} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Animated.View style={[s.items, trackStyle]}>{items}</Animated.View>
          </View>
        </GestureDetector>
      )}
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
  viewport: { flex: 1, overflow: 'hidden' },
  items: { paddingVertical: EDGE_PADDING },
  item: { height: ROW_HEIGHT, justifyContent: 'center' },
  yearLabel: { width: '64.285714%', alignSelf: 'flex-end' },
  monthLabel: { width: '92.105263%', alignSelf: 'flex-start' },
  labelFrame: { height: 24 },
  text: { position: 'absolute', left: 0, right: 0, top: 0, fontFamily: F.medium, fontSize: 18, lineHeight: 24, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, color: '#3A3A3C' },
  selected: { fontFamily: F.display, color: C.ink },
});
