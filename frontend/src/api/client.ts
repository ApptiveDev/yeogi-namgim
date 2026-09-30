import type { ApiSuccess } from './types';

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
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const result: ApiSuccess<T> = await response.json();
    return result.data;
  } finally {
    clearTimeout(timer);
  }
}