export const API_VERSION = 'v1';

export const API_BASE_PATH = `/api/${API_VERSION}`;

export const API_VERSION_HEADER = 'X-API-Version';

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'UNSUPPORTED_MEDIA_TYPE',
  'INVALID_CREDENTIALS',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'FORBIDDEN_ORIGIN',
  'EMAIL_TAKEN',
  'INVALID_OR_EXPIRED_TOKEN',
  'USER_NOT_FOUND',
  'LAST_ADMIN',
  'RATE_LIMITED',
  'NOT_FOUND',
  'UNSUPPORTED_API_VERSION',
  'METHOD_NOT_ALLOWED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
};
