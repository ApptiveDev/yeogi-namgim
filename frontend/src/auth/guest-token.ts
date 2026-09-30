import * as SecureStore from 'expo-secure-store';
import { createGuestSession } from '@/api/guest-session';

const TOKEN_KEY = 'yeogi.dev.guestToken';

export async function getGuestToken(): Promise<string> {
  const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);

  if (savedToken) {
    return savedToken;
  }

  const session = await createGuestSession();

  await SecureStore.setItemAsync(TOKEN_KEY, session.guestToken);

  return session.guestToken;
}

export async function readSavedGuestToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) {
    throw new Error('저장된 인증 토큰이 없습니다.');
  }
  return token;
}