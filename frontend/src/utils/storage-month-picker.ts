export const MONTH_PICKER_ROW_HEIGHT = 36;
export const MONTH_PICKER_VISIBLE_ROWS = 5;
export const MONTH_PICKER_WIDTH = 280;
export const MONTH_PICKER_HEIGHT = 248;

export type MonthPickerAnchor = { x: number; y: number; width: number; height: number };
type Viewport = { width: number; height: number; topInset: number; bottomInset: number; leftInset: number; rightInset: number };

export const STORAGE_FIRST_YEAR = 2025;

export function monthPickerYears(currentYear: number): number[] {
  return Array.from({ length: currentYear - STORAGE_FIRST_YEAR + 1 }, (_, index) => STORAGE_FIRST_YEAR + index);
}

export function isStorageMonthAllowed(date: Date, today = new Date()): boolean {
  return date.getFullYear() >= STORAGE_FIRST_YEAR && date.getFullYear() <= today.getFullYear();
}

export function monthPickerIndex(offset: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(offset / MONTH_PICKER_ROW_HEIGHT)));
}

export function monthPickerPosition(anchor: MonthPickerAnchor, viewport: Viewport) {
  const margin = 16;
  const gap = 10;
  const minLeft = viewport.leftInset + margin;
  const width = Math.min(MONTH_PICKER_WIDTH, viewport.width - minLeft - viewport.rightInset - margin);
  const centerX = anchor.x + anchor.width / 2;
  const left = Math.max(minLeft, Math.min(centerX - width / 2, viewport.width - viewport.rightInset - margin - width));
  const minTop = viewport.topInset + margin;
  const maxTop = Math.max(minTop, viewport.height - viewport.bottomInset - margin - MONTH_PICKER_HEIGHT);
  const below = anchor.y + anchor.height + gap;
  const above = anchor.y - gap - MONTH_PICKER_HEIGHT;
  const opensAbove = below > maxTop && above >= minTop;
  const top = Math.max(minTop, Math.min(opensAbove ? above : below, maxTop));
  const pointerLeft = Math.max(22, Math.min(centerX - left - 11, width - 44));
  return { width, left, top, pointerLeft, opensAbove };
}
