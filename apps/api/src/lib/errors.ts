import type { ErrorCode } from '@ricfey/shared';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  LLM_CAP_REACHED: 429,
  LLM_INVALID_OUTPUT: 502,
  LLM_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/**
 * The only error type routes should throw on purpose. Its message is shown to the client,
 * so it must be safe for users to read. Anything else thrown becomes a generic 500.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  /** `details` is sent to the client. `cause` is for logs and scripts only, never sent. */
  constructor(code: ErrorCode, message: string, details?: unknown, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
  }
}
