import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getMemberProfile, login, logout, refreshTokens, type TokenPair } from '../api/auth';
import { ApiError } from '../api/client';

const STORAGE_KEY = 'yeogi.member.session';
type Session = { accessToken: string; refreshToken: string; accessExpiresAt: number; refreshExpiresAt: number };
type AuthState = { status: 'loading' | 'authenticated' | 'signedOut' | 'error'; session: Session | null; error: string | null };
const initialState: AuthState = { status: 'loading', session: null, error: null };
let state = initialState;
let initialization: Promise<void> | undefined;
let refreshing: Promise<void> | undefined;
let signingOut: Promise<void> | undefined;
let memberSessionKey = 0;
const listeners = new Set<() => void>();

export const getAuthState = () => state;
export const getInitialAuthState = () => initialState;
// Changes only when the login changes, not when its tokens rotate.
export const getMemberSessionKey = () => memberSessionKey;
export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function readStoredSession() {
  return Platform.OS === 'web' ? globalThis.localStorage.getItem(STORAGE_KEY) : SecureStore.getItemAsync(STORAGE_KEY);
}
async function storeSession(session: Session | null) {
  if (Platform.OS === 'web') {
    if (session) globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else globalThis.localStorage.removeItem(STORAGE_KEY);
  } else if (session) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}
async function clearSession(error: string | null = null) {
  memberSessionKey += 1;
  try { await storeSession(null); }
  catch { error = '기기의 로그인 정보를 삭제하지 못했어요. 다시 로그인해 주세요.'; }
  publish({ status: 'signedOut', session: null, error });
}
async function saveTokens(tokens: TokenPair, requestedAt: number) {
  const session: Session = {
    accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
    accessExpiresAt: requestedAt + tokens.expiresIn * 1000,
    refreshExpiresAt: requestedAt + tokens.refreshExpiresIn * 1000,
  };
  await storeSession(session);
  publish({ status: 'authenticated', session, error: null });
}

export function refreshSession(): Promise<void> {
  if (signingOut) return signingOut.then(() => {}, () => refreshSession());
  if (refreshing) return refreshing;
  const session = state.session;
  if (!session) return Promise.resolve();
  refreshing = (async () => {
    try {
      if (session.refreshExpiresAt <= Date.now()) throw new Error('로그인 기간이 만료됐어요. 다시 로그인해 주세요.');
      const requestedAt = Date.now();
      await saveTokens(await refreshTokens(session.refreshToken), requestedAt);
    } catch {
      await clearSession('로그인을 유지하지 못했어요. 다시 로그인해 주세요.');
    }
  })().finally(() => { refreshing = undefined; });
  return refreshing;
}

export function initializeSession(retry = false) {
  if (initialization && (!retry || state.status === 'loading')) return initialization;
  memberSessionKey += 1;
  publish({ status: 'loading', session: null, error: null });
  initialization = (async () => {
    try {
      const raw = await readStoredSession();
      if (!raw) { publish({ status: 'signedOut', session: null, error: null }); return; }
      let session: Session;
      try {
        session = JSON.parse(raw);
        if (typeof session?.accessToken !== 'string' || !session.accessToken
          || typeof session.refreshToken !== 'string' || !session.refreshToken || !Number.isFinite(session.accessExpiresAt)
          || !Number.isFinite(session.refreshExpiresAt)) throw new Error('Invalid session');
      } catch { await clearSession(); return; }
      if (session.refreshExpiresAt <= Date.now()) { await clearSession(); return; }
      publish({ status: 'loading', session, error: null });
      if (session.accessExpiresAt <= Date.now() + 30_000) { await refreshSession(); return; }
      try { await getMemberProfile(session.accessToken); }
      catch (error) {
        if (error instanceof ApiError && error.status === 401) { await refreshSession(); return; }
        throw error;
      }
      publish({ status: 'authenticated', session, error: null });
    } catch (error) {
      publish({ status: 'error', session: null, error: error instanceof Error ? error.message : '로그인 정보를 불러오지 못했어요.' });
    }
  })();
  return initialization;
}

export async function signIn(email: string, password: string) {
  const requestedAt = Date.now();
  const tokens = await login(email, password);
  memberSessionKey += 1;
  await saveTokens(tokens, requestedAt);
}

/** Share token rotation and discard responses belonging to a previous login. */
export async function runMemberRequest<T>(request: (accessToken: string) => Promise<T>): Promise<T> {
  const owner = memberSessionKey;
  const requireSession = () => {
    if (owner !== memberSessionKey || state.status !== 'authenticated' || !state.session) {
      throw new Error('로그인 정보를 확인해 주세요.');
    }
    return state.session;
  };
  if (requireSession().accessExpiresAt <= Date.now() + 30_000) await refreshSession();
  const token = requireSession().accessToken;
  try {
    const result = await request(token);
    requireSession();
    return result;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    // Another request or the session timer may already have refreshed this token.
    if (requireSession().accessToken === token) await refreshSession();
    try {
      const result = await request(requireSession().accessToken);
      requireSession();
      return result;
    } catch (retryError) {
      if (owner === memberSessionKey && retryError instanceof ApiError && retryError.status === 401) {
        await clearSession('로그인이 만료됐어요. 다시 로그인해 주세요.');
      }
      throw retryError;
    }
  }
}

export function signOut(): Promise<void> {
  if (signingOut) return signingOut;
  signingOut = (async () => {
    if (refreshing) await refreshing;
    const session = state.session;
    if (session) await logout(session.refreshToken);
    await clearSession();
  })().finally(() => { signingOut = undefined; });
  return signingOut;
}
