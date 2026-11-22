import { API_BASE_PATH, type ApiErrorBody, type ErrorCode } from '@veritas/schemas';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: ErrorCode | 'NETWORK_ERROR', message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method: options.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
  }

  const payload = (await response.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    );
  }

  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
