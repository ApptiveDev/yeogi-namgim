import { useState } from 'react';

import { STORAGE_FILTERS } from '@/constants/storage';
import type { StorageFilter, StorageFilterCounts, StorageNote } from '@/types/storage';
import { dateKey, isSameMonth, shiftMonth, startOfMonth } from '@/utils/storage-calendar';
import { isStorageMonthAllowed } from '@/utils/storage-month-picker';

export function useStorageNotes(notes: readonly StorageNote[], filter: StorageFilter = 'all') {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeFilter = STORAGE_FILTERS.find((item) => item.id === filter)!;
  const monthNotes = notes.filter((note) => isSameMonth(new Date(note.createdAt), month));
  // 배지 수는 표시 월 기준이며, 날짜를 선택해도 다른 필터의 전체 건수를 유지합니다.
  const counts = Object.fromEntries(STORAGE_FILTERS.map((item) => [
    item.id, monthNotes.filter(item.matches).length,
  ])) as StorageFilterCounts;
  const filteredNotes = monthNotes.filter(activeFilter.matches);
  const markedDates = new Set(filteredNotes.map((note) => dateKey(new Date(note.createdAt))));
  const visibleNotes = filteredNotes
    .filter((note) => !selectedDate || dateKey(new Date(note.createdAt)) === selectedDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function changeMonth(offset: number) {
    const next = shiftMonth(month, offset);
    if (!isStorageMonthAllowed(next)) return;
    setMonth(next);
    setSelectedDate(null);
  }

  function selectDate(date: Date) {
    if (!isStorageMonthAllowed(date)) return;
    const key = dateKey(date);
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
    setSelectedDate((current) => current === key ? null : key);
  }

  function selectMonth(date: Date) {
    if (!isStorageMonthAllowed(date)) return;
    setMonth(startOfMonth(date));
    setSelectedDate(null);
  }

  return {
    filter, month, selectedDate, selectDate, changeMonth, selectMonth,
    counts, markedDates, visibleNotes, activeFilter,
  };
}
