import { ApiError, apiRequest } from './client';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
};
export type MemberProfile = { userId: string; email: string; nickname: string; createdAt: string };

function post<T>(path: string, body: object) {
  return apiRequest<T>(`/api/v1/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

export async function requestEmailVerification(email: string) {
  const result = await post<{ verificationId: string; expiresIn: number }>('email-verifications', { email: email.trim().toLowerCase() });
  if (!result?.verificationId || !(result.expiresIn > 0)) throw new Error('인증 메일 발송 결과를 확인하지 못했어요. 다시 요청해 주세요.');
  return result;
}

export async function confirmEmailVerification(email: string, verificationId: string, code: string) {
  const result = await post<{ verificationToken: string; expiresIn: number }>('email-verifications/confirm', {
    email: email.trim().toLowerCase(), verificationId, code,
  });
  if (!result?.verificationToken || !(result.expiresIn > 0)) throw new Error('이메일 인증 결과를 확인하지 못했어요. 인증번호를 다시 요청해 주세요.');
  return result;
}

export async function signup(values: { email: string; nickname: string; password: string; passwordConfirm: string; verificationToken: string }) {
  return validateProfile(await post<MemberProfile>('signup', { ...values, email: values.email.trim().toLowerCase(), nickname: values.nickname.trim() }));
}

function validateTokens(result: TokenPair) {
  if (typeof result?.accessToken !== 'string' || !result.accessToken
    || typeof result.refreshToken !== 'string' || !result.refreshToken || result.tokenType !== 'Bearer'
    || !Number.isFinite(result.expiresIn) || result.expiresIn <= 0
    || !Number.isFinite(result.refreshExpiresIn) || result.refreshExpiresIn <= 0) {
    throw new Error('로그인 정보를 확인하지 못했어요. 다시 로그인해 주세요.');
  }
  return result;
}

export async function login(email: string, password: string) {
  return validateTokens(await post<TokenPair>('login', { email: email.trim().toLowerCase(), password }));
}

export async function refreshTokens(refreshToken: string) {
  return validateTokens(await post<TokenPair>('refresh', { refreshToken }));
}

export async function logout(refreshToken: string) {
  const result = await post<{ loggedOut: boolean }>('logout', { refreshToken });
  if (result?.loggedOut !== true) throw new Error('로그아웃 결과를 확인하지 못했어요. 다시 시도해 주세요.');
}

function validateProfile(result: MemberProfile) {
  if (typeof result?.userId !== 'string' || !result.userId || typeof result.email !== 'string'
    || typeof result.nickname !== 'string' || typeof result.createdAt !== 'string') {
    throw new Error('회원 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

export async function getMemberProfile(accessToken: string) {
  return validateProfile(await apiRequest<MemberProfile>('/api/v1/users/me', { headers: { Authorization: `Bearer ${accessToken}` } }));
}

export async function updateMemberProfile(nickname: string, accessToken: string) {
  return validateProfile(await apiRequest<MemberProfile>('/api/v1/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nickname.trim() }),
  }));
}

export function authErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) return '회원 인증 서비스를 사용할 수 없어요. 서버 설정을 확인해 주세요.';
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.';
}
