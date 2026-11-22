import { getContext } from '@/server/context';
import { assertSameOrigin, handler, json } from '@/server/http';
import { authenticateRequest, clearSessionCookie } from '@/server/session';

export const POST = handler(async (req) => {
  const context = getContext();
  assertSameOrigin(req, context.config);

  const session = await authenticateRequest(req);
  if (session) {
    await context.auth.logout(session.sessionId);
  }

  const response = json({ message: 'Signed out' });
  clearSessionCookie(response);
  return response;
});
