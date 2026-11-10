import { useCallback, useMemo, useState } from 'react';

import { STORAGE_FILTERS } from '@/constants/storage';
import type { StorageFilter, StorageFilterCounts, StorageNote } from '@/types/storage';
import { dateKey, getSeoulToday, isSameMonth, shiftMonth, startOfMonth } from '@/utils/storage-calendar';
import { isStorageMonthAllowed } from '@/utils/storage-month-picker';

type CalendarSelection = {
  month: Date;
  selectedDate: string | null;
};

const EMPTY_NOTES: readonly StorageNote[] = [];

function getMonthNotes(notes: readonly StorageNote[], month: Date) {
  const counts: StorageFilterCounts = { all: 0, saved: 0, mine: 0, friends: 0 };
  const entries = [];

  for (const note of notes) {
    const date = new Date(note.createdAt);
    if (!isSameMonth(date, month)) continue;

    // 배지는 선택 날짜와 관계없이 표시 중인 달의 전체 건수를 보여줍니다.
    for (const filter of STORAGE_FILTERS) {
      if (filter.matches(note)) counts[filter.id]++;
    }
    entries.push({ note, dateKey: dateKey(date), timestamp: date.getTime() });
  }

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return { counts, entries };
}

export function useStorageNotes(notes: readonly StorageNote[], filter: StorageFilter = 'all') {
  const [{ month, selectedDate }, setSelection] = useState<CalendarSelection>(() => ({
    month: startOfMonth(getSeoulToday()),
    selectedDate: null,
  }));
  const activeFilter = STORAGE_FILTERS.find((item) => item.id === filter) ?? STORAGE_FILTERS[0];
  const { counts, entries } = useMemo(() => getMonthNotes(notes, month), [notes, month]);
  const { markedDates, filteredNotes, notesByDate } = useMemo(() => {
    const filteredNotes: StorageNote[] = [];
    const notesByDate = new Map<string, StorageNote[]>();

    for (const { note, dateKey } of entries) {
      if (!activeFilter.matches(note)) continue;
      filteredNotes.push(note);

      const dayNotes = notesByDate.get(dateKey);
      if (dayNotes) dayNotes.push(note);
      else notesByDate.set(dateKey, [note]);
    }

    return { markedDates: new Set(notesByDate.keys()), filteredNotes, notesByDate };
  }, [entries, activeFilter]);
  const visibleNotes = selectedDate ? notesByDate.get(selectedDate) ?? EMPTY_NOTES : filteredNotes;

  const changeMonth = useCallback((offset: number) => {
    const today = getSeoulToday();
    setSelection((current) => {
      const nextMonth = shiftMonth(current.month, offset);
      if (!isStorageMonthAllowed(nextMonth, today)) return current;
      return { month: nextMonth, selectedDate: null };
    });
  }, []);

  const selectDate = useCallback((date: Date) => {
    if (!isStorageMonthAllowed(date, getSeoulToday())) return;
    const key = dateKey(date);
    setSelection((current) => ({
      month: isSameMonth(date, current.month) ? current.month : startOfMonth(date),
      selectedDate: current.selectedDate === key ? null : key,
    }));
  }, []);

  const selectMonth = useCallback((date: Date) => {
    if (!isStorageMonthAllowed(date, getSeoulToday())) return;
    setSelection((current) => {
      if (!isSameMonth(date, current.month)) return { month: startOfMonth(date), selectedDate: null };
      return current.selectedDate === null ? current : { ...current, selectedDate: null };
    });
  }, []);

  return {
    filter,
    activeFilter,
    month,
    selectedDate,
    counts,
    markedDates,
    visibleNotes,
    changeMonth,
    selectDate,
    selectMonth,
  };
}
