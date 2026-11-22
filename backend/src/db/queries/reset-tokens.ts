import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { getDb } from '../client';
import { passwordResetTokens, users } from '../schema';

/** Stores a new reset token for the user, invalidating any earlier unused ones. */
export async function createResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));
    await tx.insert(passwordResetTokens).values(input);
  });
}

/**
 * Atomically validates a token (exists, unused, unexpired), marks it used, and sets the new
 * password hash. Returns the user id on success, or null if the token is invalid.
 */
export async function consumeResetToken(
  tokenHash: string,
  newPasswordHash: string,
): Promise<string | null> {
  return getDb().transaction(async (tx) => {
    const [token] = await tx
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
      .for('update');
    if (!token) return null;

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, token.id));
    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, token.userId));
    // Any other outstanding reset links for this user are now dead.
    await tx
      .delete(passwordResetTokens)
      .where(
        and(eq(passwordResetTokens.userId, token.userId), ne(passwordResetTokens.id, token.id)),
      );
    return token.userId;
  });
}
