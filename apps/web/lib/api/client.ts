import { storageKeys } from '@/lib/storage/keys';
import { readString } from '@/lib/storage/local-store';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export function isApiEnabled() {
  return Boolean(apiBaseUrl);
}

export class ApiError extends Error {
  constructor(message = 'validation.required') {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  if (!apiBaseUrl) throw new ApiError('validation.required');
  const token = readString(storageKeys.apiToken);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'validation.required';
    throw new ApiError(message);
  }
  return payload as T;
}
