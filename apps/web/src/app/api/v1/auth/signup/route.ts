import { signupSchema } from '@veritas/schemas';
import { getContext } from '@/server/context';
import { assertSameOrigin, clientIp, enforceRateLimit, handler, json, readJson } from '@/server/http';
import { attachSessionCookie } from '@/server/session';

export const POST = handler(async (req) => {
  const context = getContext();
  assertSameOrigin(req, context.config);
  enforceRateLimit(context, `signup:${clientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 });

  const input = await readJson(req, signupSchema);
  const issued = await context.auth.signup(input);

  const response = json({ user: issued.user }, { status: 201 });
  attachSessionCookie(response, issued.token, issued.expiresInSeconds);
  return response;
});
