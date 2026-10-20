import type { ApiFailure, ApiResponse } from '@ricfey/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiFailure['error']['code'],
    message: string,
  ) {
    super(message);
  }
}

/**
 * Call the API through the Vite proxy (/api → :4000). Returns `data` or throws ApiError
 * with the server's code and user-safe message.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
  });
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, 'INTERNAL_ERROR', 'The server sent an unexpected response.');
  }
  if (!body.success) throw new ApiError(res.status, body.error.code, body.error.message);
  return body.data;
}

export const post = <T>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
