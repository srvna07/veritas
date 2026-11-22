import { loginSchema } from '@veritas/schemas';
import { getContext } from '@/server/context';
import { assertSameOrigin, clientIp, enforceRateLimit, handler, json, readJson } from '@/server/http';
import { attachSessionCookie } from '@/server/session';

const WINDOW_MS = 15 * 60 * 1000;

export const POST = handler(async (req) => {
  const context = getContext();
  assertSameOrigin(req, context.config);

  const input = await readJson(req, loginSchema);
  const ip = clientIp(req);
  enforceRateLimit(context, `login:ip:${ip}`, { limit: 50, windowMs: WINDOW_MS });
  enforceRateLimit(context, `login:account:${ip}:${input.email}`, { limit: 10, windowMs: WINDOW_MS });

  const issued = await context.auth.login(input);

  const response = json({ user: issued.user });
  attachSessionCookie(response, issued.token, issued.expiresInSeconds);
  return response;
});
