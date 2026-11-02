// 로컬 날짜를 사용해 UTC 변환으로 날짜가 하루 밀리는 것을 방지합니다.
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function isSameMonth(date: Date, month: Date): boolean {
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

export function calendarDays(month: Date): Date[] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const count = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
  return Array.from({ length: count }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - first.getDay() + 1));
}
