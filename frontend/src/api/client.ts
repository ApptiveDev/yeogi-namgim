import type { ApiFailure, ApiSuccess } from './types';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('API 서버 주소가 없습니다.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}${path}`,
      { ...options, signal: controller.signal },
    );

    if (!response.ok) {
      const failure: ApiFailure | null = await response.json().catch(() => null);
      if (response.status === 401) {
        throw new Error('인증 정보를 확인할 수 없어요. 앱을 다시 실행해 주세요.');
      }
      throw new Error(failure?.error?.message || `API 요청 실패: ${response.status}`);
    }

    const result: ApiSuccess<T> = await response.json();
    if (result.success !== true) {
      throw new Error('서버 응답을 확인할 수 없어요.');
    }
    return result.data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(path === '/api/v1/notes' && options.method === 'POST'
        ? '응답 시간이 초과됐어요. 저장됐을 수 있으니 지도에서 확인 후 다시 시도해 주세요.'
        : '응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.');
    }
    if (error instanceof TypeError) {
      throw new Error('서버에 연결할 수 없어요. 네트워크 연결을 확인해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
