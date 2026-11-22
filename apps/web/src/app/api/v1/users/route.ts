import { getContext } from '@/server/context';
import { handler, json } from '@/server/http';
import { requirePermission } from '@/server/session';

export const GET = handler(async (req) => {
  await requirePermission(req, 'users:read');
  const users = await getContext().auth.listUsers();
  return json({ users });
});
