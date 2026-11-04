import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { MonthPickerWheel } from '@/components/storage/MonthPickerWheel';
import { FontFamilies } from '@/constants/fonts';
import { STORAGE_MONTHS, StorageColors as C } from '@/constants/storage';
import {
  type MonthPickerAnchor,
  MONTH_PICKER_HEIGHT,
  MONTH_PICKER_ROW_HEIGHT,
  MONTH_PICKER_WHEEL_HEIGHT,
  MONTH_PICKER_WHEEL_PADDING,
  monthPickerPosition,
  monthPickerYears,
} from '@/utils/storage-month-picker';

type Props = {
  month: Date;
  anchor: MonthPickerAnchor;
  onConfirm: (month: Date) => void;
  onClose: () => void;
};

const MONTHS = STORAGE_MONTHS.map((_, index) => index + 1);
const ENTER_ANIMATION = FadeIn.duration(120).reduceMotion(ReduceMotion.System);
const formatYear = (year: number) => String(year);
const formatMonth = (month: number, selected: boolean) => selected ? STORAGE_MONTHS[month - 1] : STORAGE_MONTHS[month - 1].slice(0, 3);

export function StorageMonthPicker({ month, anchor, onConfirm, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(() => month.getFullYear());
  const [monthNumber, setMonthNumber] = useState(() => month.getMonth() + 1);
  const [years] = useState(() => monthPickerYears(new Date().getFullYear()));
  const [yearScrolling, setYearScrolling] = useState(false);
  const [monthScrolling, setMonthScrolling] = useState(false);
  const scrolling = yearScrolling || monthScrolling;
  const position = monthPickerPosition(anchor, {
    width,
    height,
    topInset: insets.top,
    bottomInset: insets.bottom,
    leftInset: insets.left,
    rightInset: insets.right,
  });

  function chooseToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthNumber(today.getMonth() + 1);
  }

  function confirm() {
    if (scrolling) return;
    onConfirm(new Date(year, monthNumber - 1, 1));
    onClose();
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="년월 선택 취소"
        />
        <Animated.View
          entering={ENTER_ANIMATION}
          style={[s.popover, { width: position.width, left: position.left, top: position.top }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <Image
            source={require('../../../assets/images/storage-month-picker-pointer.svg')}
            style={[s.pointer, { left: position.pointerLeft }, position.opensAbove && s.pointerBelow]}
            contentFit="contain"
            accessible={false}
          />
          <View style={s.wheels}>
            <View style={s.highlight} pointerEvents="none" />
            <MonthPickerWheel
              label="연도 선택"
              kind="year"
              values={years}
              value={year}
              format={formatYear}
              onChange={setYear}
              onScrollingChange={setYearScrolling}
            />
            <MonthPickerWheel
              label="월 선택"
              kind="month"
              values={MONTHS}
              value={monthNumber}
              format={formatMonth}
              onChange={setMonthNumber}
              onScrollingChange={setMonthScrolling}
            />
          </View>
          <View style={s.divider} />
          <View style={s.footer}>
            <Pressable
              onPress={chooseToday}
              disabled={scrolling}
              accessibilityRole="button"
              accessibilityLabel="오늘의 년월 선택"
              accessibilityState={{ disabled: scrolling }}
              style={s.todayButton}
            >
              <Text style={s.todayText}>오늘</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={scrolling}
              accessibilityRole="button"
              accessibilityLabel={`${year}년 ${monthNumber}월 선택 완료`}
              accessibilityState={{ disabled: scrolling }}
              style={({ pressed }) => [s.doneButton, (pressed || scrolling) && s.dimmed]}
            >
              <Text style={s.doneText}>완료</Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1 },
  popover: { position: 'absolute', height: MONTH_PICKER_HEIGHT, backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.6)', boxShadow: '0px 12px 32px 0px rgba(0, 0, 0, 0.18)' },
  pointer: { position: 'absolute', top: -9, width: 22, height: 10, zIndex: 1 },
  pointerBelow: { top: undefined, bottom: -9, transform: [{ rotate: '180deg' }] },
  wheels: { marginTop: 7, marginHorizontal: 7, height: MONTH_PICKER_WHEEL_HEIGHT, flexDirection: 'row' },
  highlight: { position: 'absolute', top: MONTH_PICKER_WHEEL_PADDING, left: 0, right: 0, height: MONTH_PICKER_ROW_HEIGHT, backgroundColor: C.lime, borderRadius: 10 },
  divider: { height: 2, backgroundColor: '#F0F0F0', marginHorizontal: 15, marginTop: 8 },
  footer: { height: 32, marginTop: 10, marginHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayButton: { height: 32, justifyContent: 'center', paddingHorizontal: 10 },
  todayText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 14, color: C.blue, includeFontPadding: false },
  doneButton: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#0E0E0E' },
  doneText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 12, color: C.surface, includeFontPadding: false },
  dimmed: { opacity: 0.5 },
});
