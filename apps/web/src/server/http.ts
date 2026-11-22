import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, type AuthConfig } from '@veritas/auth';
import { API_VERSION, API_VERSION_HEADER, type ApiErrorBody } from '@veritas/schemas';
import type { AppContext } from './context';
import type { RateLimitRule } from './rate-limit';

export type RouteParams<P extends Record<string, string | string[]> = Record<string, string | string[]>> = {
  params: Promise<P>;
};

const MAX_BODY_CHARS = 10_000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function baseHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  headers.set(API_VERSION_HEADER, API_VERSION);
  headers.set('Cache-Control', 'no-store');
  return headers;
}

export function json<T>(data: T, init: { status?: number; headers?: Record<string, string> } = {}): NextResponse {
  return NextResponse.json(data, { status: init.status ?? 200, headers: baseHeaders(init.headers) });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    };
    return json(body, { status: error.status, headers: error.headers });
  }
  if (error instanceof z.ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid data',
        details: z.flattenError(error).fieldErrors as Record<string, string[]>,
      },
    };
    return json(body, { status: 422 });
  }
  console.error('Unhandled API error', error);
  const body: ApiErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };
  return json(body, { status: 500 });
}

export function handler<P extends Record<string, string | string[]> = Record<string, string | string[]>>(
  fn: (req: NextRequest, route: RouteParams<P>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, route: RouteParams<P>): Promise<NextResponse> => {
    try {
      return await fn(req, route);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) {
    throw new AppError(400, 'INVALID_JSON', 'Request body is too large');
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

export function assertSameOrigin(req: NextRequest, config: AuthConfig): void {
  if (SAFE_METHODS.has(req.method)) {
    return;
  }
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Cross-site requests are not allowed');
  }
  const origin = req.headers.get('origin');
  if (!origin) {
    return;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Cross-site requests are not allowed');
  }
  const allowedHosts = new Set<string>([new URL(config.appUrl).host]);
  const requestHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (requestHost) {
    allowedHosts.add(requestHost);
  }
  if (!allowedHosts.has(originHost)) {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Cross-site requests are not allowed');
  }
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(context: AppContext, key: string, rule: RateLimitRule): void {
  const result = context.limiter.hit(key, rule);
  if (!result.allowed) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please try again later.', {
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    });
  }
}
