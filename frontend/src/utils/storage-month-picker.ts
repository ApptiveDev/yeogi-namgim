export const MONTH_PICKER_ROW_HEIGHT = 36;
export const MONTH_PICKER_VISIBLE_ROWS = 5;
export const MONTH_PICKER_WIDTH = 280;
export const MONTH_PICKER_HEIGHT = 248;
export const MONTH_PICKER_SPRING = {
  stiffness: 324,
  damping: 36,
  mass: 1,
  overshootClamping: true,
  energyThreshold: 0.0001,
};

const RELEASE_PROJECTION_SECONDS = 0.09;
const MAX_RELEASE_ROWS = 2;
const MAX_RELEASE_VELOCITY = MAX_RELEASE_ROWS * MONTH_PICKER_ROW_HEIGHT / RELEASE_PROJECTION_SECONDS;

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
  'worklet';
  return Math.max(0, Math.min(count - 1, Math.round(offset / MONTH_PICKER_ROW_HEIGHT)));
}

export function monthPickerRelease(offset: number, velocity: number, count: number) {
  'worklet';
  const boundedVelocity = Math.max(-MAX_RELEASE_VELOCITY, Math.min(MAX_RELEASE_VELOCITY, velocity));
  const index = monthPickerIndex(offset + boundedVelocity * RELEASE_PROJECTION_SECONDS, count);
  const distance = index * MONTH_PICKER_ROW_HEIGHT - offset;
  // 가까운 칸으로 이동할 때도 초기 속도가 커서 중앙에서 갑자기 멈추지 않도록 제한합니다.
  const approachLimit = Math.abs(distance) * Math.sqrt(MONTH_PICKER_SPRING.stiffness / MONTH_PICKER_SPRING.mass);
  const springVelocity = Math.sign(distance) === Math.sign(boundedVelocity)
    ? Math.sign(distance) * Math.min(Math.abs(boundedVelocity), approachLimit)
    : 0;
  return { index, springVelocity };
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
