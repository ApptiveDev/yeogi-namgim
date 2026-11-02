export function formatActivityTime(createdAt: string, now: number): string {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return '';

  const minutes = Math.max(0, Math.floor((now - createdAtMs) / 60_000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (24 * 60))}일 전`;
}
