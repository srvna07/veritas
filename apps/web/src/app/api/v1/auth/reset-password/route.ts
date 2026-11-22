import { resetPasswordSchema } from '@veritas/schemas';
import { getContext } from '@/server/context';
import { assertSameOrigin, clientIp, enforceRateLimit, handler, json, readJson } from '@/server/http';

export const POST = handler(async (req) => {
  const context = getContext();
  assertSameOrigin(req, context.config);
  enforceRateLimit(context, `reset:ip:${clientIp(req)}`, { limit: 10, windowMs: 15 * 60 * 1000 });

  const input = await readJson(req, resetPasswordSchema);
  await context.auth.resetPassword(input);

  return json({ message: 'Password updated. Please sign in with your new password.' });
});
