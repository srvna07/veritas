import { forgotPasswordSchema } from '@veritas/schemas';
import { getContext } from '@/server/context';
import { assertSameOrigin, clientIp, enforceRateLimit, handler, json, readJson } from '@/server/http';

const WINDOW_MS = 60 * 60 * 1000;

export const POST = handler(async (req) => {
  const context = getContext();
  assertSameOrigin(req, context.config);

  const input = await readJson(req, forgotPasswordSchema);
  const ip = clientIp(req);
  enforceRateLimit(context, `forgot:ip:${ip}`, { limit: 20, windowMs: WINDOW_MS });
  enforceRateLimit(context, `forgot:email:${input.email}`, { limit: 5, windowMs: WINDOW_MS });

  await context.auth.forgotPassword(input);

  return json({ message: 'If an account exists for that email, a reset link has been sent' });
});
