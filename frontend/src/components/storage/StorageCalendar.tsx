import { Image } from 'expo-image';
import { memo, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StorageMonthPicker } from '@/components/storage/StorageMonthPicker';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { STORAGE_MONTHS, STORAGE_WEEKDAYS } from '@/constants/storage';
import { calendarDays, dateKey, isSameMonth, shiftMonth } from '@/utils/storage-calendar';
import { type MonthPickerAnchor, isStorageMonthAllowed } from '@/utils/storage-month-picker';

type Props = {
  month: Date;
  today: Date;
  selectedDate: string | null;
  markedDates: ReadonlySet<string>;
  onChangeMonth: (offset: number) => void;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (month: Date) => void;
};

const CHEVRON_ICON = require('../../../assets/images/storage-chevron-right.svg');

export const StorageCalendar = memo(function StorageCalendar({
  month,
  today,
  selectedDate,
  markedDates,
  onChangeMonth,
  onSelectDate,
  onSelectMonth,
}: Props) {
  const days = useMemo(() => calendarDays(month).map((date) => ({
    date,
    key: dateKey(date),
    inMonth: isSameMonth(date, month),
  })), [month]);
  const todayKey = dateKey(today);

  return (
    <View style={s.calendar}>
      <CalendarHeading
        month={month}
        today={today}
        onChangeMonth={onChangeMonth}
        onSelectMonth={onSelectMonth}
      />
      <View style={s.weekdays}>
        {STORAGE_WEEKDAYS.map((day, index) => (
          <Text key={day} style={[s.weekday, index === 0 && s.sunday]}>{day}</Text>
        ))}
      </View>
      <View style={s.grid}>
        {days.map(({ date, key, inMonth }) => (
          <CalendarDay
            key={key}
            date={date}
            inMonth={inMonth}
            isToday={key === todayKey}
            selected={key === selectedDate}
            hasNotes={markedDates.has(key)}
            disabled={!isStorageMonthAllowed(date, today)}
            onSelect={onSelectDate}
          />
        ))}
      </View>
    </View>
  );
});

type CalendarHeadingProps = Pick<Props, 'month' | 'today' | 'onChangeMonth' | 'onSelectMonth'>;

function CalendarHeading({ month, today, onChangeMonth, onSelectMonth }: CalendarHeadingProps) {
  const monthButtonRef = useRef<View>(null);
  const [pickerAnchor, setPickerAnchor] = useState<MonthPickerAnchor | null>(null);
  const previousDisabled = !isStorageMonthAllowed(shiftMonth(month, -1), today);
  const nextDisabled = !isStorageMonthAllowed(shiftMonth(month, 1), today);

  function openMonthPicker() {
    monthButtonRef.current?.measureInWindow((x, y, width, height) => {
      setPickerAnchor({ x, y, width, height });
    });
  }

  return (
    <View style={s.heading}>
      <MonthArrow offset={-1} disabled={previousDisabled} onChangeMonth={onChangeMonth} />
      <Pressable
        ref={monthButtonRef}
        onPress={openMonthPicker}
        accessibilityRole="button"
        accessibilityLabel={`${month.getFullYear()}년 ${month.getMonth() + 1}월, 년월 선택`}
        accessibilityHint="연도와 월을 스크롤로 선택합니다"
        accessibilityState={{ expanded: pickerAnchor !== null }}
        style={s.monthButton}
      >
        <Text numberOfLines={1} adjustsFontSizeToFit style={s.month} accessibilityLiveRegion="polite">
          {`${month.getFullYear()} · ${STORAGE_MONTHS[month.getMonth()]}`}
        </Text>
      </Pressable>
      <MonthArrow offset={1} disabled={nextDisabled} onChangeMonth={onChangeMonth} />
      {pickerAnchor && (
        <StorageMonthPicker
          month={month}
          anchor={pickerAnchor}
          onConfirm={onSelectMonth}
          onClose={() => setPickerAnchor(null)}
        />
      )}
    </View>
  );
}

type MonthArrowProps = {
  offset: -1 | 1;
  disabled: boolean;
  onChangeMonth: (offset: number) => void;
};

function MonthArrow({ offset, disabled, onChangeMonth }: MonthArrowProps) {
  const previous = offset === -1;

  return (
    <Pressable
      onPress={() => onChangeMonth(offset)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={previous ? '이전 달' : '다음 달'}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={[s.arrowButton, disabled && s.disabledArrow]}
    >
      <View style={s.arrowIconFrame} accessible={false}>
        <Image source={CHEVRON_ICON} style={[s.chevron, previous && s.previous]} contentFit="contain" accessible={false} />
      </View>
    </Pressable>
  );
}

type CalendarDayProps = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  hasNotes: boolean;
  disabled: boolean;
  onSelect: (date: Date) => void;
};

const CalendarDay = memo(function CalendarDay({
  date,
  inMonth,
  isToday,
  selected,
  hasNotes,
  disabled,
  onSelect,
}: CalendarDayProps) {
  const day = date.getDate();
  const dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${day}일`;

  return (
    <Pressable
      onPress={() => onSelect(date)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${dateLabel}${isToday ? ', 오늘' : ''}${hasNotes ? ', 노트 있음' : ''}`}
      accessibilityHint={selected ? '다시 누르면 날짜 선택을 해제합니다' : '이 날짜의 노트를 봅니다'}
      accessibilityState={{ selected, disabled }}
      style={s.dayCell}
    >
      <View style={[s.dayCircle, isToday && s.today, selected && s.selected]}>
        <Text style={[s.day, date.getDay() === 0 && s.sunday, !inMonth && s.outsideMonth, isToday && s.todayText]}>
          {day}
        </Text>
        {hasNotes && <View style={s.dot} />}
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  calendar: { backgroundColor: C.surface, borderRadius: 28, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18, boxShadow: '0px 2px 10px 0px rgba(0, 0, 0, 0.05)' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  arrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  disabledArrow: { opacity: 0.25 },
  arrowIconFrame: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 4, height: 8 },
  previous: { transform: [{ rotate: '180deg' }] },
  monthButton: { flex: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  month: { fontFamily: FontFamilies.archivoBlack, color: C.ink, fontSize: 18, lineHeight: 24, textAlign: 'center', includeFontPadding: false, letterSpacing: -0.5 },
  weekdays: { flexDirection: 'row', paddingVertical: 5 },
  weekday: { width: '14.285714%', textAlign: 'center', fontFamily: FontFamilies.notoSansKrRegular, color: C.muted, fontSize: 12, lineHeight: 22, includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  day: { width: '100%', fontFamily: FontFamilies.interSemiBold, color: C.ink, fontSize: 15, lineHeight: 20, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  sunday: { color: C.sunday },
  outsideMonth: { color: C.outsideMonth },
  today: { backgroundColor: C.lime, borderColor: C.ink },
  todayText: { color: C.ink },
  selected: { borderColor: C.blue },
  dot: { position: 'absolute', bottom: 0.5, width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink },
});
