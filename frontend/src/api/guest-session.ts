import { apiRequest } from './client';
import type { GuestSession } from './types';

export async function createGuestSession(): Promise<GuestSession> {
  const session = await apiRequest<GuestSession>(
    '/api/v1/guest-sessions',
    { method: 'POST' },
  );

  if (!session?.guestId || !session?.guestToken) {
    throw new Error('id 값 혹은 token 값이 유효하지 않습니다.');
  }

  return session;
}