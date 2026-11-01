import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STORAGE_MONTHS, STORAGE_WEEKDAYS, StorageColors as C, StorageFonts as F } from '@/constants/storage';
import { calendarDays, dateKey, isSameMonth } from '@/utils/storage-calendar';

type Props = {
  month: Date;
  today: Date;
  selectedDate: string | null;
  markedDates: ReadonlySet<string>;
  onChangeMonth: (offset: number) => void;
  onSelectDate: (date: Date) => void;
  onToday: () => void;
};

export function StorageCalendar({ month, today, selectedDate, markedDates, onChangeMonth, onSelectDate, onToday }: Props) {
  const todayKey = dateKey(today);

  return (
    <View style={s.calendar}>
      <View style={s.heading}>
        <Pressable onPress={() => onChangeMonth(-1)} accessibilityRole="button" accessibilityLabel="이전 달" hitSlop={6} style={s.arrowButton}>
          <View style={s.arrowIconFrame} accessible={false}>
            <Image source={require('../../../assets/images/storage-chevron-right.svg')} style={[s.chevron, s.previous]} contentFit="contain" accessible={false} />
          </View>
        </Pressable>
        <Pressable onPress={onToday} accessibilityRole="button" accessibilityLabel={`${month.getFullYear()}년 ${month.getMonth() + 1}월, 이번 달로 돌아가기`} style={s.monthButton}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={s.month} accessibilityLiveRegion="polite">
            {`${month.getFullYear()} · ${STORAGE_MONTHS[month.getMonth()]}`}
          </Text>
        </Pressable>
        <Pressable onPress={() => onChangeMonth(1)} accessibilityRole="button" accessibilityLabel="다음 달" hitSlop={6} style={s.arrowButton}>
          <View style={s.arrowIconFrame} accessible={false}>
            <Image source={require('../../../assets/images/storage-chevron-right.svg')} style={s.chevron} contentFit="contain" accessible={false} />
          </View>
        </Pressable>
      </View>
      <View style={s.weekdays}>
        {STORAGE_WEEKDAYS.map((day, index) => <Text key={day} style={[s.weekday, index === 0 && s.sunday]}>{day}</Text>)}
      </View>
      <View style={s.grid}>
        {calendarDays(month).map((date) => {
          const key = dateKey(date);
          const isToday = key === todayKey;
          const selected = key === selectedDate;
          const inMonth = isSameMonth(date, month);
          const hasNotes = markedDates.has(key);
          return (
            <Pressable key={key} onPress={() => onSelectDate(date)} accessibilityRole="button" accessibilityLabel={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일${isToday ? ', 오늘' : ''}${hasNotes ? ', 노트 있음' : ''}`} accessibilityHint={selected ? '다시 누르면 날짜 선택을 해제합니다' : '이 날짜의 노트를 봅니다'} accessibilityState={{ selected }} style={s.dayCell}>
              <View style={[s.dayCircle, isToday && s.today, selected && s.selected]}>
                <Text style={[s.day, date.getDay() === 0 && s.sunday, !inMonth && s.outsideMonth, isToday && s.todayText]}>{date.getDate()}</Text>
              </View>
              {hasNotes && <View style={s.dot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  calendar: { backgroundColor: C.surface, borderRadius: 28, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18, boxShadow: '0px 2px 10px 0px rgba(0, 0, 0, 0.05)' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  arrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  arrowIconFrame: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 4, height: 8 },
  previous: { transform: [{ rotate: '180deg' }] },
  monthButton: { flex: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  month: { fontFamily: F.display, color: C.ink, fontSize: 18, lineHeight: 24, textAlign: 'center', includeFontPadding: false, letterSpacing: -0.5 },
  weekdays: { flexDirection: 'row', paddingVertical: 5 },
  weekday: { width: '14.285714%', textAlign: 'center', fontFamily: F.regular, color: C.muted, fontSize: 12, lineHeight: 22, includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  day: { width: '100%', fontFamily: F.bold, color: C.ink, fontSize: 16, lineHeight: 20, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  sunday: { color: C.sunday },
  outsideMonth: { color: C.outsideMonth },
  today: { backgroundColor: C.lime, borderColor: C.ink },
  todayText: { color: C.ink },
  selected: { borderColor: C.blue },
  dot: { position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3, backgroundColor: C.ink },
});
