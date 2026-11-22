import type { ErrorCode } from '@veritas/schemas';

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: Record<string, string[]>;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options: { details?: Record<string, string[]>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers;
  }
}
