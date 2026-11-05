export function formatMyNoteCount(count: number | null, maximum: number) {
  if (count === null) return '—';
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return value > maximum ? `${maximum}+` : String(value);
}
