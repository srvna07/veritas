import { AppError } from '@veritas/auth';
import { API_BASE_PATH, API_VERSION } from '@veritas/schemas';
import { handler } from '@/server/http';

const fallback = handler<{ path: string[] }>(async (_req, route) => {
  const { path } = await route.params;
  const first = path[0] ?? '';
  if (/^v\d+$/i.test(first) && first.toLowerCase() !== API_VERSION) {
    throw new AppError(
      404,
      'UNSUPPORTED_API_VERSION',
      `API version "${first}" is not supported. Use ${API_BASE_PATH}`,
    );
  }
  if (first.toLowerCase() === API_VERSION) {
    throw new AppError(404, 'NOT_FOUND', 'Endpoint not found');
  }
  throw new AppError(404, 'NOT_FOUND', `Endpoint not found. API routes are versioned under ${API_BASE_PATH}`);
});

export const GET = fallback;
export const POST = fallback;
export const PUT = fallback;
export const PATCH = fallback;
export const DELETE = fallback;
export const HEAD = fallback;
export const OPTIONS = fallback;
