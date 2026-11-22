import { handler, json } from '@/server/http';
import { requireSession } from '@/server/session';

export const GET = handler(async (req) => {
  const session = await requireSession(req);
  return json({ user: session.user });
});
