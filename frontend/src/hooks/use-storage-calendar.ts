import { useCallback, useState } from 'react';

import { STORAGE_FILTERS } from '@/constants/storage';
import type { StorageFilter } from '@/types/storage';
import { dateKey, getSeoulToday, isSameMonth, shiftMonth, startOfMonth } from '@/utils/storage-calendar';
import { isStorageMonthAllowed } from '@/utils/storage-month-picker';

type CalendarSelection = {
  month: Date;
  selectedDate: string | null;
};

export function useStorageCalendar(filter: StorageFilter = 'all') {
  const [{ month, selectedDate }, setSelection] = useState<CalendarSelection>(() => ({
    month: startOfMonth(getSeoulToday()),
    selectedDate: null,
  }));
  const activeFilter = STORAGE_FILTERS.find((item) => item.id === filter) ?? STORAGE_FILTERS[0];
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
    changeMonth,
    selectDate,
    selectMonth,
  };
}
