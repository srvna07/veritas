import { headers } from 'next/headers';

/**
 * Best-effort client IP for rate limiting. Only trustworthy when the app sits behind a proxy
 * that sets/overwrites X-Forwarded-For; otherwise a client can spoof it.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
