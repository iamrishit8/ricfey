import type { ApiSuccess } from '@ricfey/shared';

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}
