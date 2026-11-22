'use server';

import { revalidatePath } from 'next/cache';
import { updateUserRole } from '@veritas/db';
import { updateUserRoleSchema } from '@veritas/schemas';
import { fail, type ActionResult } from '@/lib/action-result';
import { requireRole } from '@/lib/session';

/** Admin-only. The role check happens here, on the server, not just in the UI or proxy. */
export async function updateUserRoleAction(input: unknown): Promise<ActionResult> {
  await requireRole(['admin']);

  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request');

  const result = await updateUserRole(parsed.data.userId, parsed.data.role);
  if (result === 'not_found') return fail('User not found');
  if (result === 'last_admin') return fail('You cannot remove the last admin');

  revalidatePath('/admin/users');
  return { ok: true };
}
