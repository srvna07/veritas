import { redirect } from 'next/navigation';
import { roleSchema, hasRole, type Role } from '@veritas/schemas';
import { auth } from '@/auth';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Returns the signed-in user, or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const role = roleSchema.safeParse(session?.user?.role);
  if (!session?.user?.id || !role.success) redirect('/login');
  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? 'User',
    email: session.user.email ?? '',
    role: role.data,
  };
}

/** Returns the signed-in user if they hold one of the roles, otherwise redirects. */
export async function requireRole(allowed: readonly Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user.role, allowed)) redirect('/forbidden');
  return user;
}
