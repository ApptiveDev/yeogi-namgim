import { ApiError } from '../api/client';

export function normalizeInvitationCode(value: string) {
  return value.trim().toUpperCase();
}

export function validateInvitationCode(value: string): string | null {
  return /^[A-HJ-NP-Z2-9]{16}$/.test(normalizeInvitationCode(value))
    ? null : '영문과 숫자로 된 초대 코드 16자리를 입력해 주세요. 공백이나 하이픈은 넣지 않아요.';
}

export function friendErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'FRIEND_INVITATION_INVALID': return '없는 코드이거나 만료 또는 사용된 코드예요. 새로운 초대 코드를 받아 주세요.';
      case 'FRIEND_SELF_INVITATION': return '내가 만든 코드로는 친구를 추가할 수 없어요.';
      case 'FRIEND_ALREADY_EXISTS': return '이미 친구인 사용자예요. 친구 목록을 확인해 주세요.';
      case 'TOO_MANY_REQUESTS': return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    }
  }
  return error instanceof Error ? error.message : '친구 정보를 확인하지 못했어요. 다시 시도해 주세요.';
}

export function formatActivityTime(createdAtMs: number, now: number): string {
  if (!Number.isFinite(createdAtMs)) return '';

  const minutes = Math.max(0, Math.floor((now - createdAtMs) / 60_000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (24 * 60))}일 전`;
}
