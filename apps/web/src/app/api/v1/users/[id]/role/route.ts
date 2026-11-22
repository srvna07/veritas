import { z } from 'zod';
import { AppError } from '@veritas/auth';
import { updateRoleSchema } from '@veritas/schemas';
import { getContext } from '@/server/context';
import { assertSameOrigin, handler, json, readJson } from '@/server/http';
import { requirePermission } from '@/server/session';

export const PATCH = handler<{ id: string }>(async (req, route) => {
  const context = getContext();
  assertSameOrigin(req, context.config);
  await requirePermission(req, 'users:manage_roles');

  const { id } = await route.params;
  if (!z.uuid().safeParse(id).success) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const { role } = await readJson(req, updateRoleSchema);
  const user = await context.auth.setRole(id, role);
  return json({ user });
});
