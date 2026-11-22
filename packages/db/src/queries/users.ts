import { asc, eq } from 'drizzle-orm';
import type { Role } from '@veritas/schemas';
import { getDb } from '../client';
import { users, type User } from '../schema';

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'createdAt'>;

export async function findUserByEmail(email: string): Promise<User | null> {
  const [row] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** Returns null if the email is already registered (race-safe via ON CONFLICT). */
export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}): Promise<User | null> {
  const [row] = await getDb().insert(users).values(input).onConflictDoNothing().returning();
  return row ?? null;
}

/** Create the user, or update an existing one to admin with the given password hash. */
export async function upsertAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const [row] = await getDb()
    .insert(users)
    .values({ ...input, role: 'admin' })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: input.name,
        passwordHash: input.passwordHash,
        role: 'admin',
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error('Failed to upsert admin');
  return row;
}

export async function listUsers(): Promise<PublicUser[]> {
  return getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}

export type UpdateRoleResult = 'ok' | 'not_found' | 'last_admin';

/** Changes a user's role, refusing to remove the last remaining admin. */
export async function updateUserRole(userId: string, role: Role): Promise<UpdateRoleResult> {
  return getDb().transaction(async (tx) => {
    // Lock all admin rows so two concurrent demotions cannot both succeed.
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .for('update');
    const [target] = await tx
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return 'not_found';
    if (target.role === 'admin' && role !== 'admin' && admins.length <= 1) return 'last_admin';
    await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    return 'ok';
  });
}
